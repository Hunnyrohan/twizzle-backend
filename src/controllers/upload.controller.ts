import { Request, Response } from 'express';

class UploadController {
  async uploadProfileImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile image uploaded successfully',
        data: {
          path: `uploads/${req.file.filename}`.replace(/\\/g, '/'),
        },
      });
    } catch (error) {
      console.error('UPLOAD ERROR:', error);
      return res.status(500).json({
        success: false,
        message: 'Image upload failed',
      });
    }
  }
}

export default new UploadController();
