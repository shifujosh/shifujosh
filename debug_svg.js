const fs = require('fs');
const path = require('path');
const svgPath = path.join(__dirname, 'assets/portfolio_ecosystem.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');
const targetText = "Multimodal Creation Engine";
const textIndex = svgContent.indexOf(targetText);

if (textIndex === -1) {
    console.log("Text not found");
} else {
    // Print 500 chars before
    console.log(svgContent.substring(Math.max(0, textIndex - 500), textIndex));
}
