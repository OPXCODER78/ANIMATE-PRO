
interface IconSvgMap {
    name: string;
    svgString: string;
}

export const replaceIconPlaceholdersInHtml = (html: string, iconSvgs: IconSvgMap[]): string => {
    let updatedHtml = html;

    iconSvgs.forEach(icon => {
        const iconName = icon.name;
        const svgString = icon.svgString;

        // Regex for comment placeholder: <!-- ICON: icon_name -->
        const commentPlaceholderRegex = new RegExp(`<!--\\s*ICON:\\s*${iconName}\\s*-->`, 'gi');
        
        // Regex for div placeholder: <div data-icon-placeholder="icon_name" class="..."></div>
        // This regex captures the opening div tag to preserve its attributes.
        const divPlaceholderRegex = new RegExp(`<div\\s+data-icon-placeholder=["']${iconName}["']([^>]*)>.*?<\\/div>`, 'gi');

        // Replace comment placeholders
        updatedHtml = updatedHtml.replace(commentPlaceholderRegex, svgString);

        // Replace div placeholders, preserving classes from the div
        updatedHtml = updatedHtml.replace(divPlaceholderRegex, (match, attributes) => {
            // Extract existing classes from attributes string
            const classMatch = attributes.match(/class=["'](.*?)["']/);
            const existingClasses = classMatch && classMatch[1] ? classMatch[1] : '';
            
            // Attempt to parse the SVG and add classes to the <svg> root element
            try {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
                const svgElement = svgDoc.documentElement;
                if (svgElement && svgElement.nodeName.toLowerCase() === 'svg') {
                    if (existingClasses) {
                        const currentSvgClasses = svgElement.getAttribute('class') || '';
                        svgElement.setAttribute('class', `${currentSvgClasses} ${existingClasses}`.trim());
                    }
                     // Preserve other attributes from the placeholder div if needed, though typically class is most important.
                    // For example, to transfer all data-* attributes:
                    // const placeholderDiv = parser.parseFromString(match, "text/html").body.firstChild as HTMLElement;
                    // if(placeholderDiv) {
                    //    for (const attr of Array.from(placeholderDiv.attributes)) {
                    //        if (attr.name.startsWith('data-') && attr.name !== 'data-icon-placeholder') {
                    //            svgElement.setAttribute(attr.name, attr.value);
                    //        }
                    //    }
                    // }
                    return svgElement.outerHTML;
                }
            } catch (e) {
                console.error(`Error parsing SVG for icon ${iconName}:`, e);
                // Fallback to inserting SVG string as is if parsing fails, wrapped in the original div attributes
                // This might not be ideal if SVG itself has fixed size and div has layout classes
                return `<div ${attributes}>${svgString}</div>`; 
            }
            // Fallback if SVG parsing somehow fails to produce a valid element, return SVG string (less ideal)
            return svgString;
        });
    });

    return updatedHtml;
};
