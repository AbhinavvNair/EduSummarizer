document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const processBtn = document.getElementById('processBtn');
    const userInput = document.getElementById('userInput');
    const aiOutput = document.getElementById('aiOutput');
    const charCount = document.getElementById('charCount');
    const themeToggle = document.getElementById('themeToggle');
    const copyBtn = document.getElementById('copyBtn');

    // --- 1. DARK MODE LOGIC ---
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        
        // Update Icon/Text
        themeToggle.innerHTML = isDark 
            ? '<i class="fa-solid fa-sun"></i> Light Mode' 
            : '<i class="fa-solid fa-moon"></i> Dark Mode';
    });

    // --- 2. INPUT STATS ---
    userInput.addEventListener('input', () => {
        charCount.innerText = `${userInput.value.length} chars`;
    });

    // --- 3. THE "SMART" SIMULATION ---
    // (This runs until we connect the Python Backend)
    processBtn.addEventListener('click', async () => {
        const text = userInput.value.trim();

        if (!text) {
            alert("Please enter some notes first!");
            return;
        }

        // UI State: Loading
        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Thinking...';
        aiOutput.innerHTML = '<div class="empty-state"><i class="fa-solid fa-microchip"></i><p>Analyzing key concepts...</p></div>';

        // Fake Delay (1.5 seconds)
        await new Promise(r => setTimeout(r, 1500));

        // Generate "Fake" Smart Response
        const response = generateSmartFakeResponse(text);
        
        // Render Markdown
        aiOutput.innerHTML = marked.parse(response);
        aiOutput.classList.remove('empty-state'); // Remove center alignment for text

        // UI State: Reset
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Refine with AI';
    });

    // --- 4. COPY TO CLIPBOARD ---
    copyBtn.addEventListener('click', () => {
        if(aiOutput.innerText && !aiOutput.classList.contains('empty-state')) {
            navigator.clipboard.writeText(aiOutput.innerText);
            
            // Visual Feedback
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color:green"></i>';
            setTimeout(() => copyBtn.innerHTML = originalIcon, 2000);
        }
    });

    // --- HELPER: Generates realistic looking text based on input ---
    function generateSmartFakeResponse(inputText) {
        return `
# 📝 Intelligent Summary

**Overview:**
The notes provided cover core concepts related to: *"${inputText.substring(0, 20)}..."*

### 🔑 Key Takeaways
* **Concept Refinement:** The input has been analyzed for technical accuracy.
* **Structure:** The unstructured text has been organized into logical blocks.
* **Clarity:** Vague terms have been replaced with precise terminology.

### 📚 Detailed Notes
Here is the refined version of your text:

> "${inputText}"

### 💻 Related Code Example
Based on the context, here is a relevant structure:

\`\`\`python
def analyze_data(input_string):
    # Simulated function based on user notes
    if len(input_string) > 0:
        return "Valid Data"
    return "Empty Input"
\`\`\`
        `;
    }
});