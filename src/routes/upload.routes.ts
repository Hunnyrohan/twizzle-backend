import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import uploadController from '../controllers/upload.controller';

const router = Router();

// ✅ Always resolve absolute uploads path
const uploadDir = path.join(process.cwd(), 'uploads');

// ✅ Ensure uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.post(
  '/upload/profile-image',
  upload.single('profileImage'),
  uploadController.uploadProfileImage
);

export default router;
