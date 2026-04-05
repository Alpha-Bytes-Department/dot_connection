import fs from 'fs';
import path from 'path';

const unlinkFile = (file: string) => {
  const normalized = file.replace(/\\/g, '/');
  const marker = '/uploads/';

  let filePath = '';
  if (path.isAbsolute(file)) {
    filePath = file;
  } else if (normalized.includes(marker)) {
    const relativePart = normalized.slice(normalized.lastIndexOf(marker) + marker.length);
    filePath = path.join('uploads', relativePart);
  } else {
    filePath = path.join('uploads', normalized.replace(/^\/+/, ''));
  }

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default unlinkFile;
