const { UTApi } = require('uploadthing/server');

const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

exports.uploadTicket = async (file) => {
  const utFile = new File([file.buffer], file.originalname, { type: file.mimetype });
  const { data, error } = await utapi.uploadFiles(utFile);

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return data.url;
};
