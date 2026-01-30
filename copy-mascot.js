const fs = require('fs');
const path = require('path');

const src = 'C:/Users/User/.gemini/antigravity/brain/d1350b95-33e9-40fe-a90e-f6a88e931018/delivery_mascot_1769741152943.png';
const dest = path.join(__dirname, 'public', 'mascot.png');

try {
    fs.copyFileSync(src, dest);
    console.log('Mascot copied successfully!');
} catch (err) {
    console.error('Error:', err.message);
}
