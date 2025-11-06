import multer from 'multer';

// Simple in-memory storage for uploads. Change to diskStorage or cloud upload for production.
const storage = multer.memoryStorage();
const upload = multer({ storage });

export default upload;
