const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'assets/portfolio_ecosystem.svg');
let svgContent = fs.readFileSync(svgPath, 'utf8');

// Target the specific label text
const targetText = "Multimodal Creation Engine";

// 1. Find the text position
const textIndex = svgContent.indexOf(targetText);
if (textIndex === -1) {
    console.error("Could not find target text in SVG");
    process.exit(1);
}

// 2. Walk backwards to find the opening <g class="label"> (or similar) that wraps it.
// We look for the nearest preceding "<g " that likely starts the label group.
// In Mermaid, typically it's <g class="label" ...>
const searchArea = svgContent.substring(Math.max(0, textIndex - 1000), textIndex);
const openingTagRegex = /<g\s+class="cluster-label"/g; 
let match;
let lastMatchIndex = -1;
while ((match = openingTagRegex.exec(searchArea)) !== null) {
    lastMatchIndex = match.index;
}

if (lastMatchIndex === -1) {
    console.error("Could not find opening group tag for label");
    process.exit(1);
}

// Calculate absolute start index of the <g>
// The searchArea started at (textIndex - 1000). 
// So absolute index = (textIndex - 1000) + lastMatchIndex
// BUT we need to be careful with substring start.
const absoluteStartIndex = Math.max(0, textIndex - 1000) + lastMatchIndex;

// 3. Find the closing </g> for this group.
// We need to balance tags.
let depth = 0;
let currentIndex = absoluteStartIndex;
let endIndex = -1;

// We assume the tag starts exactly at absoluteStartIndex with "<g"
// We'll walk forward parsing tags
const subset = svgContent.substring(absoluteStartIndex);

// Simple tag walker
let i = 0;
while (i < subset.length) {
    if (subset.startsWith("<g", i)) {
        depth++;
        i += 2;
    } else if (subset.startsWith("</g>", i)) {
        depth--;
        i += 4;
        if (depth === 0) {
            endIndex = absoluteStartIndex + i;
            break;
        }
    } else {
        i++;
    }
}

if (endIndex === -1) {
    console.error("Could not find closing tag for label group");
    process.exit(1);
}

// 4. Extract the group
const groupContent = svgContent.substring(absoluteStartIndex, endIndex);

// 5. Remove from original position
const newSvgContentWithoutGroup = svgContent.substring(0, absoluteStartIndex) + svgContent.substring(endIndex);

// 6. Insert at the end, just before </svg>
// We also need to wrap it in a <g> to ensure it has no weird transform issues, 
// though moving it should preserve its own transform attributes.
// The SVG usually ends with </g></g></svg> or similar. We insert before the last </svg>.
const finalSvg = newSvgContentWithoutGroup.replace('</svg>', `${groupContent}</svg>`);

fs.writeFileSync(svgPath, finalSvg);
console.log("Successfully moved label to top layer.");
