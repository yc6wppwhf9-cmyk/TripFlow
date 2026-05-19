const { UTApi } = require('uploadthing/server');

const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

async function uploadFile(file) {
  const utFile = new File([file.buffer], file.originalname, { type: file.mimetype });
  const { data, error } = await utapi.uploadFiles(utFile);
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return data.url;
}

exports.uploadFile   = uploadFile;
exports.uploadTicket = uploadFile; // alias kept for existing vendor upload calls
