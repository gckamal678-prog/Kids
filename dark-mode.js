/* dark-mode.js - Dark Mode & Child Safety Lock System */

// १. Dark Mode Toggle
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Saved Preference Check
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

// २. Child Safety Lock (अभिभावक मोड)
function openParentalLock(callbackFunction) {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    
    const userAnswer = prompt(`अभिभावक सुरक्षा जाँच: ${num1} + ${num2} कति हुन्छ?`);
    
    if (parseInt(userAnswer) === answer) {
        alert("सुरक्षा जाँच सफल भयो!");
        callbackFunction();
    } else {
        alert("गलत उत्तर! पहुँच अस्वीकृत गरियो।");
    }
}
