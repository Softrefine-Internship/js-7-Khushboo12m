// Screen references
const screen1 = document.getElementById('screen1');
const screen2 = document.getElementById('screen2');
const screen3 = document.getElementById('screen3');
const screen4 = document.getElementById('screen4'); 

// Form inputs
const questionCountInput = document.getElementById('questionCount');
const categorySelect = document.getElementById('category');
const difficultySelect = document.getElementById('difficulty');
const typeSelect = document.getElementById('type');
const startBtn = document.getElementById('startQuiz');

// Quiz screen
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const questionNumberDisplay = document.getElementById('questionNumber');
const nextBtn = document.getElementById('nextBtn');
const quitBtn = document.getElementById('quitQuiz');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');

// Result screen
const finalScoreDisplay = document.getElementById('finalScore');
const resultMessage = document.getElementById('resultMessage');
const playAgainBtn = document.getElementById('playAgain');

// Review
const reviewList = document.getElementById("reviewList");
const reviewBtn = document.getElementById('review-btn');

// Error box
const errorBox = document.getElementById('errorMessage');

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
const questionTime = 30;
let timeLeft = questionTime;
let userAnswers = []; 

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  setTimeout(() => {
    errorBox.classList.add('hidden');
  }, 5000);
}

function saveState() {
  const state = {
    screen: getCurrentScreen(),
    currentQuestionIndex,
    score,
    userAnswers,
    questions,
    timeLeft
  };
  localStorage.setItem('quizState', JSON.stringify(state));
}

function getCurrentScreen() {
  if (!screen1.classList.contains('hidden')) return 'screen1';
  if (!screen2.classList.contains('hidden')) return 'screen2';
  if (!screen3.classList.contains('hidden')) return 'screen3';
  if (!screen4.classList.contains('hidden')) return 'screen4';
  return 'screen1';
}

document.addEventListener('DOMContentLoaded', () => {
  fetchCategories();

  const saved = localStorage.getItem('quizState');
  if (saved) {
    const state = JSON.parse(saved);
    questions = state.questions;
    currentQuestionIndex = state.currentQuestionIndex;
    score = state.score;
    userAnswers = state.userAnswers || [];
    timeLeft = state.timeLeft || questionTime;

    scoreDisplay.textContent = score;

    switch (state.screen) {
      case 'screen2':
        screen1.classList.add('hidden');
        screen2.classList.remove('hidden');
        showQuestion();
        break;
      case 'screen3':
        screen1.classList.add('hidden');
        screen3.classList.remove('hidden');
        showResult();
        break;
      case 'screen4':
        screen1.classList.add('hidden');
        screen4.classList.remove('hidden');
        renderReview();
        break;
      default:
        screen1.classList.remove('hidden');
    }
  }
});

async function fetchCategories() {
  try {
    const res = await fetch('https://opentdb.com/api_category.php');
    const data = await res.json();

    data.trivia_categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });
  } catch (err) {
    showError('Failed to load categories. Please check your internet and refresh.');
  }
}

startBtn.addEventListener('click', async () => {
  const amount = questionCountInput.value;
  const category = categorySelect.value;
  const difficulty = difficultySelect.value;
  const type = typeSelect.value;

  if (!amount || isNaN(amount) || amount < 1 || amount > 50) {
    showError('Please enter a valid number of questions (1-50).');
    return;
  }

  let apiURL = `https://opentdb.com/api.php?amount=${amount}`;
  if (category) apiURL += `&category=${category}`;
  if (difficulty) apiURL += `&difficulty=${difficulty}`;
  if (type) apiURL += `&type=${type}`;

  startBtn.disabled = true;

  try {
    const res = await fetch(apiURL);
    const data = await res.json();

    switch (data.response_code) {
      case 0:
        questions = data.results;
        startQuiz();
        break;
      case 1:
        throw new Error("Sorry, not enough questions. Try fewer questions or a different category.");
      case 2:
        throw new Error("Invalid inputs. Please check your selections and try again.");
      case 3:
        throw new Error("Something went wrong. Please reload the page.");
      case 4:
        throw new Error("You've completed all questions. Try different filters.");
      case 5:
        throw new Error("Too many requests. Wait a bit and try again.");
      default:
        throw new Error("Unexpected error occurred.");
    }
  } catch (err) {
    showError(err.message);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Quiz';
  }
});

function startQuiz() {
  if (!questions || questions.length === 0) {
    showError('No questions found. Please try again.');
    return;
  }

  screen1.classList.add('hidden');
  screen2.classList.remove('hidden');

  userAnswers = [];
  currentQuestionIndex = 0;
  score = 0;
  scoreDisplay.textContent = score;

  showQuestion();
}

function showQuestion() {
  clearInterval(timer);
  timeLeft = questionTime;
  updateTimerDisplay();
  timer = setInterval(countdown, 1000);

  const current = questions[currentQuestionIndex];
  const question = decodeHTML(current.question);
  const correct = decodeHTML(current.correct_answer);
  const incorrect = current.incorrect_answers.map(ans => decodeHTML(ans));
  const options = shuffleArray([correct, ...incorrect]);

  questionText.innerHTML = question;
  questionNumberDisplay.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;

  optionsContainer.innerHTML = '';

  options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = option;
    btn.addEventListener('click', () => {
      handleAnswer(option, correct);
    });
    optionsContainer.appendChild(btn);
  });

  saveState(); // Save after rendering question
}

function countdown() {
  timeLeft--;
  updateTimerDisplay();

  if (timeLeft <= 0) {
    clearInterval(timer);
    disableOptions();

    userAnswers.push({
      question: decodeHTML(questions[currentQuestionIndex].question),
      selected: null,
      correct: decodeHTML(questions[currentQuestionIndex].correct_answer),
    });

    setTimeout(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        showQuestion();
      } else {
        showResult();
      }
    }, 3000);
  }
}

function updateTimerDisplay() {
  timerDisplay.textContent = timeLeft;
}

function disableOptions() {
  const buttons = document.querySelectorAll('.option-btn');
  const correct = decodeHTML(questions[currentQuestionIndex].correct_answer);
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add('correct');
  });
}

function handleAnswer(selected, correct) {
  clearInterval(timer);

  const buttons = document.querySelectorAll('.option-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) btn.classList.add('correct');
    if (btn.textContent === selected && selected !== correct) btn.classList.add('wrong');
  });

  if (selected === correct) {
    score++;
    scoreDisplay.textContent = score;
  }

  userAnswers.push({
    question: decodeHTML(questions[currentQuestionIndex].question),
    selected: selected,
    correct: correct,
  });

  saveState(); 
}

nextBtn.addEventListener('click', () => {
  const alreadyAnswered = userAnswers.find(
    ans => ans.question === decodeHTML(questions[currentQuestionIndex].question)
  );

  if (!alreadyAnswered) {
    userAnswers.push({
      question: decodeHTML(questions[currentQuestionIndex].question),
      selected: null,
      correct: decodeHTML(questions[currentQuestionIndex].correct_answer),
    });
  }

  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
  } else {
    showResult();
  }
});

quitBtn.addEventListener('click', () => {
  clearInterval(timer);
  screen2.classList.add('hidden');
  screen3.classList.remove('hidden');
  showResult();
});

function showResult() {
  screen2.classList.add('hidden');
  screen3.classList.remove('hidden');

  const totalQuestions = questions.length;
  const correctAnswers = score;
  const attemptedQuestions = currentQuestionIndex;
  const wrongAnswers = attemptedQuestions - correctAnswers;

  finalScoreDisplay.textContent = score;

  const message =
    score === totalQuestions ? 'Perfect! 🏆' :
    score >= totalQuestions / 2 ? 'Good job! 👍' :
    'Better luck next time! 👀';

  resultMessage.textContent = message;

  const hasAttempted = userAnswers.some(ans => ans.selected !== null);
  if (!hasAttempted) {
    reviewBtn.classList.add('hidden');
  } else {
    reviewBtn.classList.remove('hidden');
  }

  saveState(); 
}

reviewBtn.addEventListener('click', () => {
  screen3.classList.add('hidden');
  screen4.classList.remove('hidden');
  renderReview();
});

function renderReview() {
  reviewList.innerHTML = '';

  if (userAnswers.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = "You did not attempt any questions.";
    msg.style.textAlign = 'center';
    msg.style.fontWeight = 'bold';
    msg.style.color = 'red';
    reviewList.appendChild(msg);
    return;
  }

  userAnswers.forEach((entry, index) => {
    const div = document.createElement('div');
    div.classList.add('review-item');

    const q = document.createElement('h4');
    q.textContent = `Q${index + 1}: ${entry.question}`;

    const selected = document.createElement('p');
    selected.innerHTML = `<strong>Your Answer:</strong> ${entry.selected || '<em>Not Answered</em>'}`;

    const correct = document.createElement('p');
    correct.innerHTML = `<strong>Correct Answer:</strong> ${entry.correct}`;

    div.appendChild(q);
    div.appendChild(selected);
    div.appendChild(correct);

    if (entry.selected !== entry.correct) {
      div.classList.add('wrong-review');
    } else {
      div.classList.add('correct-review');
    }

    reviewList.appendChild(div);
  });

  saveState(); 
}

function goToResult() {
  saveState();
  screen4.classList.add('hidden');
  screen3.classList.remove('hidden');
}

playAgainBtn.addEventListener('click', () => {
  screen3.classList.add('hidden');
  screen1.classList.remove('hidden');
  userAnswers = [];
  questions = [];
  currentQuestionIndex = 0;
  score = 0;
  localStorage.removeItem('quizState'); 
});

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}