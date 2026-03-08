import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import Payment from '../models/payment.model';
import User from '../models/user.model';
import { Types } from 'mongoose';
import crypto from 'crypto';

export const initiateVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Account already verified' });
        }

        const amount = Number(process.env.VERIFICATION_FEE_NPR) || 199;
        const timestamp = Date.now();
        const transaction_uuid = `TWZV-${user._id}-${timestamp}`;

        const payment = await Payment.create({
            user: user._id,
            purpose: 'VERIFICATION',
            provider: 'ESEWA',
            amount,
            pid: transaction_uuid,
            status: 'PENDING'
        });

        const gatewayUrl = process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
        const product_code = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
        const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';

        let successUrl = process.env.FRONTEND_SUCCESS_URL || 'http://localhost:3000/payment/esewa/success';
        let failureUrl = process.env.FRONTEND_FAILURE_URL || 'http://localhost:3000/payment/esewa/failure';

        // Ensure URLs have http/https protocol
        if (!successUrl.startsWith('http')) {
            successUrl = `http://${successUrl}`;
        }
        if (!failureUrl.startsWith('http')) {
            failureUrl = `http://${failureUrl}`;
        }

        // Generate Signature for v2
        const signatureString = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
        const signature = crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64');

        return res.status(200).json({
            success: true,
            data: {
                gatewayUrl,
                params: {
                    amount: amount.toString(),
                    tax_amount: "0",
                    total_amount: amount.toString(),
                    transaction_uuid: transaction_uuid,
                    product_code: product_code,
                    product_service_charge: "0",
                    product_delivery_charge: "0",
                    success_url: successUrl,
                    failure_url: failureUrl,
                    signed_field_names: "total_amount,transaction_uuid,product_code",
                    signature: signature
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const confirmVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { data } = req.query; // eSewa v2 returns a single encoded 'data' parameter

        if (!data) {
            return res.status(400).json({ success: false, message: 'Missing payment data' });
        }

        // Decode Base64 data
        const decodedString = Buffer.from(data as string, 'base64').toString('utf-8');
        const decodedData = JSON.parse(decodedString);

        const { transaction_uuid, transaction_code, status, total_amount, signature } = decodedData;

        if (status !== 'COMPLETE') {
            return res.status(400).json({ success: false, message: 'Payment not completed' });
        }

        const payment = await Payment.findOne({ pid: transaction_uuid });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment record not found' });
        }

        if (payment.status === 'SUCCESS') {
            return res.status(200).json({ success: true, message: 'Account already verified', data: { verified: true } });
        }

        // Verify Signature dynamically based on signed_field_names from eSewa
        const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
        const signedFieldNames = decodedData.signed_field_names;

        if (!signature || !signedFieldNames) {
            return res.status(400).json({ success: false, message: 'Missing signature in response' });
        }

        // Construct the message string in the order specified by eSewa
        const messageParts = signedFieldNames.split(',').map((field: string) => {
            return `${field}=${decodedData[field]}`;
        });
        const messageString = messageParts.join(',');

        const expectedSignature = crypto.createHmac('sha256', secretKey)
            .update(messageString)
            .digest('base64');

        if (signature !== expectedSignature) {
            console.error('Signature mismatch details:', {
                receivedSignature: signature,
                expectedSignature: expectedSignature,
                messageString: messageString,
                decodedData: decodedData
            });
            return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
        }

        payment.status = 'SUCCESS';
        payment.refId = transaction_code;
        payment.raw = decodedString;
        await payment.save();

        await User.findByIdAndUpdate(payment.user, {
            isVerified: true,
            verifiedAt: new Date(),
            verificationProvider: 'ESEWA',
            verificationTxnId: transaction_uuid,
            verificationRefId: transaction_code
        });

        return res.status(200).json({
            success: true,
            message: 'Account verified successfully',
            data: { verified: true }
        });
    } catch (error) {
        next(error);
    }
};

export const getVerificationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        return res.status(200).json({
            success: true,
            data: {
                isVerified: user.isVerified,
                verifiedAt: user.verifiedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

export const renderCheckoutForm = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { txnUuid } = req.params;
        const payment = await Payment.findOne({ pid: txnUuid });

        if (!payment) {
            return res.status(404).send('<h1>Payment not found</h1>');
        }

        if (payment.status !== 'PENDING') {
            return res.status(400).send('<h1>Payment already processed or failed</h1>');
        }

        const gatewayUrl = process.env.ESEWA_GATEWAY_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
        const product_code = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
        const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';

        let successUrl = process.env.FRONTEND_SUCCESS_URL || 'http://localhost:3000/payment/esewa/success';
        let failureUrl = process.env.FRONTEND_FAILURE_URL || 'http://localhost:3000/payment/esewa/failure';

        if (!successUrl.startsWith('http')) successUrl = `http://${successUrl}`;
        if (!failureUrl.startsWith('http')) failureUrl = `http://${failureUrl}`;

        const signatureString = `total_amount=${payment.amount},transaction_uuid=${payment.pid},product_code=${product_code}`;
        const signature = crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64');

        const params = {
            amount: payment.amount.toString(),
            tax_amount: "0",
            total_amount: payment.amount.toString(),
            transaction_uuid: payment.pid,
            product_code: product_code,
            product_service_charge: "0",
            product_delivery_charge: "0",
            success_url: successUrl,
            failure_url: failureUrl,
            signed_field_names: "total_amount,transaction_uuid,product_code",
            signature: signature
        };

        // Render auto-submitting form
        const formHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Processing Payment...</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f7f6; }
                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    h2 { color: #333; }
                </style>
            </head>
            <body>
                <div class="loader"></div>
                <h2>Redirecting to eSewa...</h2>
                <form id="esewa-form" action="${gatewayUrl}" method="POST">
                    ${Object.entries(params).map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`).join('\n                    ')}
                </form>
                <script>
                    document.getElementById('esewa-form').submit();
                </script>
            </body>
            </html>
        `;

        res.send(formHtml);
    } catch (error) {
        next(error);
    }
};
