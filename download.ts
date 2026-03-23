import fs from 'fs';
import https from 'https';

const url = "https://lh3.googleusercontent.com/aida/ADBb0ug4ej8-xPKSSKxrAyyHrx78rWFdswM9UUWmt7jZDeuJD50VX7sJ5punblDzmjcdQfJMGrPInIBsf0cqifK5doBd8fAllAVpZ6krsQJ5PvM6o7O7DnIPfsTr2gYMNE-l61Ne1W6b9n9rZ9B-BzcYW9ic11UkzcoqdPgT3QATSEVZ9P3g5mbK-52tagTSVu_M3hpNuGK-FbF8xEygklHCtGmk-iz4inNJPPyNTu69HdZz5jAZlmtIV32aRFOIrGtr5S7BUuxcNthkXg";

https.get(url, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream('./public/logo.png');
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Download completed');
    });
  } else {
    console.error('Download failed with status code:', res.statusCode);
  }
}).on('error', (err) => {
  console.error('Error:', err.message);
});
