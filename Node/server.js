
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import "dotenv/config"

import ProductController from './src/controllers/productController.js';

const server = express();
const productController = new ProductController();

// Upload folder ka absolute path
const uploadDir = path.join(process.cwd(), 'uploads');

// Folder nahi hai toh create karo
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9);

    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Sirf PDF files accept karo, maximum 5 files
const upload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext !== '.pdf') {
      return cb(new Error('Sirf PDF files upload kar sakte hain.'));
    }

    cb(null, true);
  }
});

// Static files
server.use(express.static(path.join(process.cwd(), 'src', 'views')));

// EJS setup
server.set('view engine', 'ejs');
server.set('views', path.join(process.cwd(), 'src', 'views'));

// Home route
server.get('/', productController.getProducts);

// Multiple PDF upload aur text extraction
server.post(
  '/upload-multiple',
  upload.array('myFiles', 5),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'Kam se kam ek PDF upload karo.'
      });
    }



    try {
      for (const uploadedFile of req.files) {
        const filePath = uploadedFile.path;
        let parser;

        try {
          const buffer = fs.readFileSync(filePath);

          parser = new PDFParse({ data: buffer });

          const result = await parser.getText();

          console.log(result.text);

          const question = "sun headlthcare aur suhardam aur splint hai isme ";

          const response = await fetch(
            "https://ollama.com/api/chat",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.OLLAMA_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: "gemma4:31b",
                messages: [
                  {
                    role: "system",
                    content: `Tum ek PDF research assistant ho.
                                  PDF ke content ke aadhar par simple Hindi mein jawab do.
                                  Agar jawab PDF mein nahi hai, to saaf batao.
                                  Apni taraf se facts mat ghadho.`
                  },
                  {
                    role: "user",
                    content: `PDF ka content:\n\n${result.text}\n\nMera sawaal: ${question}`
                  }
                ],
                stream: false
              })
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(JSON.stringify(data));
          }

          console.log("Sawaal:", question);
          console.log("AI ka jawab:", data.message.content);


        } finally {
          if (parser) {
            await parser.destroy();
          }
        }
      }



      return res.status(200).json({
        message: 'Saari PDFs upload aur process ho gayi hain.',

      });
    } catch (error) {
      console.error('PDF processing error:', error);

      return res.status(500).json({
        message: 'PDF process karte waqt error aaya.',
        error: error.message
      });
    }




  }


);

// Multer aur upload errors handle karo
server.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(400).json({
    message: err.message || 'Upload failed.'
  });
});

server.listen(3400, () => {
  console.log('Server running at http://localhost:3400');
});
