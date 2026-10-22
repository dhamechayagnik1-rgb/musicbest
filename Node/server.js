
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { PDFParse } from "pdf-parse";

import ProductController from "./src/controllers/productController.js";
import upload from "./src/multer.js";
import { askOllama } from "./src/ollama.js";

const server = express();

const productController = new ProductController();

// Static files
server.use(
  express.static(path.join(process.cwd(), "src", "views"))
);

// EJS setup
server.set("view engine", "ejs");
server.set(
  "views",
  path.join(process.cwd(), "src", "views")
);

// Home route
server.get("/", productController.getProducts);

// Multiple PDF upload aur AI processing
server.post(
  "/",
  upload.array("myFiles", 5),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Kam se kam ek PDF upload karo."
      });
    }

    const results = [];

    try {
      for (const uploadedFile of req.files) {
        const filePath = uploadedFile.path;
        let parser;

        try {
          const buffer = fs.readFileSync(filePath);

          parser = new PDFParse({ data: buffer });

          const result = await parser.getText();

          const question =
            "ISME KYA LIKHA HAI SAAF SAaf BATAO";

          // Ollama ko alag file ke function se call karo
          const answer = await askOllama(
            result.text,
            question
          );

          console.log("PDF:", uploadedFile.originalname);
          console.log("Sawaal:", question);
          console.log("AI ka jawab:", answer);

          results.push({
            fileName: uploadedFile.originalname,
            question,
            answer
          });
        } finally {
          if (parser) {
            await parser.destroy();
          }
        }
      }

      return res.status(200).json({
        message: "Saari PDFs process ho gayi hain.",
        results
      });
    } catch (error) {
      console.error("PDF processing error:", error);

      return res.status(500).json({
        message: "PDF process karte waqt error aaya.",
        error: error.message
      });
    }
  }
);

// Upload aur doosre errors handle karo
server.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(400).json({
    message: err.message || "Upload failed."
  });
});

server.listen(3400, () => {
  console.log("Server running at http://localhost:3400");
});
