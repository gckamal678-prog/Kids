// Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
}

// Parental Lock Math Logic
function openParentalLock(callback) {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;

    const userAnswer = prompt(`अभिभावक जाँच: ${num1} + ${num2} कति हुन्छ?`);

    if (userAnswer !== null && parseInt(userAnswer, 10) === answer) {
        if (typeof callback === 'function') {
            callback();
        }
    } else if (userAnswer !== null) {
        alert("गलत उत्तर! पुनः प्रयास गर्नुहोस्।");
    }
}
