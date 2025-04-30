document.addEventListener('DOMContentLoaded', function() {
    // Timer elements
    const timerDisplay = document.getElementById('timer');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    
    // Exercise elements
    const repCount = document.getElementById('repCount');
    const decreaseReps = document.getElementById('decreaseReps');
    const increaseReps = document.getElementById('increaseReps');
    const completeBtn = document.getElementById('completeBtn');
    const nextBtn = document.getElementById('nextBtn');
    const endWorkoutBtn = document.getElementById('endWorkoutBtn');
    const hearInstructions = document.getElementById('hearInstructions');
    
    // Timer variables
    let startTime;
    let elapsedTime = 0;
    let timerInterval;
    let isRunning = false;
    
    // Rep counter
    let reps = 0;
    
    // Example workout data - this would come from your API
    const workoutPlan = [
        { name: "Bench Press", description: "3 sets x 10 reps, 60kg", sets: 3, reps: 10, weight: 60 },
        { name: "Incline Dumbbell Press", description: "3 sets x 12 reps, 20kg each", sets: 3, reps: 12, weight: 20 },
        { name: "Push-ups", description: "3 sets to failure", sets: 3, reps: "max", weight: 0 },
        { name: "Tricep Dips", description: "3 sets x 15 reps", sets: 3, reps: 15, weight: 0 },
        { name: "Lateral Raises", description: "3 sets x 12 reps, 10kg each", sets: 3, reps: 12, weight: 10 }
    ];
    
    let currentExerciseIndex = 0;
    let currentSet = 1;
    const completedExercises = [];
    
    // Timer functions
    function startTimer() {
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(updateTimer, 1000);
        isRunning = true;
        
        // Update UI
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
    }
    
    function pauseTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        
        // Update UI
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
    }
    
    function resumeTimer() {
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(updateTimer, 1000);
        isRunning = true;
        
        // Update UI
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
    }
    
    function updateTimer() {
        elapsedTime = Date.now() - startTime;
        
        // Format time
        const seconds = Math.floor((elapsedTime / 1000) % 60).toString().padStart(2, '0');
        const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60).toString().padStart(2, '0');
        const hours = Math.floor((elapsedTime / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
        
        timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    let currentWorkoutId = null;

    async function startWorkoutSession() {
        try {
            const response = await fetch('/api/workouts/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: "Workout Session",
                    date: new Date().toISOString(),
                })
            });
            const data = await response.json();
            currentWorkoutId = data.workout_id;
        } catch (error) {
            console.error('Error starting workout:', error);
        }
    }

    async function logExercise(exerciseData) {
        if (!currentWorkoutId) return;
        
        try {
            await fetch(`/api/workouts/${currentWorkoutId}/exercises/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workout_id: currentWorkoutId,
                    ...exerciseData
                })
            });
        } catch (error) {
            console.error('Error logging exercise:', error);
        }
    }

    async function endWorkoutSession() {
        if (!currentWorkoutId) return;
        
        try {
            await fetch(`/api/workouts/${currentWorkoutId}/end`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    duration: Math.floor(elapsedTime / (1000 * 60)), // Convert ms to minutes
                    calories_burned: estimateCaloriesBurned(),
                    notes: "Completed workout"
                })
            });
            window.location.href = '/';
        } catch (error) {
            console.error('Error ending workout:', error);
        }
    }
    // Exercise functions
    function updateExerciseDisplay() {
        if (currentExerciseIndex < workoutPlan.length) {
            const currentExercise = workoutPlan[currentExerciseIndex];
            document.getElementById('currentExerciseName').textContent = currentExercise.name;
            document.getElementById('currentExerciseDesc').textContent = currentExercise.description;
            document.getElementById('setInput').value = currentSet;
            
            // Update weight input
            if (currentExercise.weight > 0) {
                document.getElementById('weightInput').value = currentExercise.weight;
                document.getElementById('weightInput').parentElement.style.display = 'flex';
            } else {
                document.getElementById('weightInput').parentElement.style.display = 'none';
            }
            
            // Reset rep counter
            reps = 0;
            repCount.textContent = reps;
            
            // Update next exercise
            if (currentExerciseIndex + 1 < workoutPlan.length) {
                const nextExercise = workoutPlan[currentExerciseIndex + 1];
                document.getElementById('nextExerciseName').textContent = nextExercise.name;
                document.getElementById('nextExerciseDesc').textContent = nextExercise.description;
                document.querySelector('.next-up').style.display = 'block';
            } else {
                document.querySelector('.next-up').style.display = 'none';
            }
        } else {
            // Workout completed
            alert('Workout completed! Great job!');
            window.location.href = '/';
        }
    }
    
    function completeCurrentExercise() {
        const currentExercise = workoutPlan[currentExerciseIndex];
        const weight = document.getElementById('weightInput').value;
        
        // If we've completed all sets, move to next exercise
        if (currentSet >= currentExercise.sets) {
            // Add to completed exercises
            const completedExercisesList = document.getElementById('completedExercises');
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item completed';
            listItem.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div>
                        <h6>${currentExercise.name}</h6>
                        <small class="text-muted">${currentExercise.sets} sets completed, ${weight}kg</small>
                    </div>
                    <div>✓</div>
                </div>
            `;
            completedExercisesList.appendChild(listItem);
            
            // Reset set counter and move to next exercise
            currentSet = 1;
            currentExerciseIndex++;
            updateExerciseDisplay();
        } else {
            // Move to next set
            currentSet++;
            document.getElementById('setInput').value = currentSet;
            
            // Reset rep counter
            reps = 0;
            repCount.textContent = reps;
        }
        
        // Log this to the server
        const exerciseData = {
            name: currentExercise.name,
            set: currentSet - 1,  // We've already incremented, so subtract 1
            reps: reps,
            weight: parseFloat(weight)
        };
        console.log('Logging exercise data:', exerciseData);
        // Here you would send this data to your API
    }
    
    function estimateCaloriesBurned() {
        // Basic estimation - you can make this more sophisticated
        const minutesWorkedOut = Math.floor(elapsedTime / (1000 * 60));
        const averageCaloriesPerMinute = 5; // Adjust based on workout intensity
        return minutesWorkedOut * averageCaloriesPerMinute;
    }

    // Voice instructions
    function speakInstructions() {
        if ('speechSynthesis' in window) {
            const currentExercise = workoutPlan[currentExerciseIndex];
            const instructions = `${currentExercise.name}. ${currentExercise.description}. This is set ${currentSet} of ${currentExercise.sets}.`;
            
            const utterance = new SpeechSynthesisUtterance(instructions);
            utterance.rate = 0.9;  // Slightly slower speech
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Sorry, your browser doesn't support text-to-speech!");
        }
    }
    
        // Add rep counter functionality
        decreaseReps.addEventListener('click', function() {
            if (reps > 0) {
                reps--;
                repCount.textContent = reps;
            }
        });
    
        increaseReps.addEventListener('click', function() {
            reps++;
            repCount.textContent = reps;
        });

    // Event listeners
    startBtn.addEventListener('click', async function() {
        await startWorkoutSession();
        startTimer();
    });

    pauseBtn.addEventListener('click', function() {
        pauseTimer();
    });

    resumeBtn.addEventListener('click', function() {
        resumeTimer();
    });
    
    completeBtn.addEventListener('click', async function() {
        const exerciseData = {
            name: workoutPlan[currentExerciseIndex].name,
            sets: currentSet,
            reps: reps,
            weight: parseFloat(document.getElementById('weightInput').value)
        };
        await logExercise(exerciseData);
        completeCurrentExercise();
    });
    
    endWorkoutBtn.addEventListener('click', async function() {
        if (confirm('End this workout session?')) {
            clearInterval(timerInterval);
            await endWorkoutSession();
        }
    });
    
    hearInstructions.addEventListener('click', speakInstructions);
    
    // Initialize exercise display
    updateExerciseDisplay();
    
    // Prevent double-tap zoom on iOS
    document.addEventListener('touchend', function(event) {
        event.preventDefault();
    }, { passive: false });
    
    // Prevent pull-to-refresh
    document.body.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
});