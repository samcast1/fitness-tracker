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
    
    let workoutPlan = [];
    try {
        const savedExercises = localStorage.getItem('workoutExercises');
        if (savedExercises) {
            const parsedExercises = JSON.parse(savedExercises);
            console.log('Loaded exercises:', parsedExercises); // Debug log
            
            if (Array.isArray(parsedExercises) && parsedExercises.length > 0) {
                workoutPlan = parsedExercises.map(exercise => {
                    // Add debug log
                    console.log('Processing exercise:', exercise);
                    
                    if (exercise.type === 'strength') {
                        return {
                            name: exercise.name,
                            description: `3 sets x 10 reps`,
                            sets: 3,
                            reps: 10,
                            weight: 0,
                            type: 'strength'
                        };
                    } else if (exercise.type === 'conditioning') {
                        return {
                            name: exercise.name,
                            description: 'Enter distance',
                            type: 'conditioning',
                            distance: 0
                        };
                    }
                    return null; // Handle unknown exercise types
                }).filter(exercise => exercise !== null); // Remove any null entries
                
                // Debug log
                console.log('Processed workout plan:', workoutPlan);
                
                // If workout plan is empty after processing, redirect
                if (workoutPlan.length === 0) {
                    console.error('No valid exercises found in saved data');
                    window.location.href = '/new-workout';
                }
            } else {
                console.error('Saved exercises is not an array or is empty');
                window.location.href = '/new-workout';
            }
        } else {
            console.error('No saved exercises found');
            window.location.href = '/new-workout';
        }
    } catch (error) {
        console.error('Error loading workout plan:', error);
        window.location.href = '/new-workout';
    }
    
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
            const workoutData = {
                date: new Date().toISOString().split('T')[0],
                name: "Workout Session",
                duration: 0,
                calories_burned: 0,
                exercises: []
            };

            const response = await fetch('/api/workouts/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workoutData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                throw new Error(`Failed to start workout sessions: ${response.status}`);
            }

            const data = await response.json();
            currentWorkoutId = data.workout_id;
        } catch (error) {
            console.error('Error starting workout:', error);
            alert('Failed to start workout session. Please try again.');
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

            // Handle different exercise types
            if (currentExercise.type === 'strength') {
                // Show strength training inputs
                document.getElementById('strengthInputs').style.display = 'block';
                document.getElementById('conditioningInputs').style.display = 'none';
                document.getElementById('currentExerciseDesc').textContent = 
                    `Set ${currentSet} of ${currentExercise.sets}`;
                
                // Update weight input
                document.getElementById('weightInput').value = currentExercise.weight;
                
                // Reset rep counter
                reps = 0;
                repCount.textContent = reps;
            } else if (currentExercise.type === 'conditioning') {
                // Show conditioning inputs
                document.getElementById('strengthInputs').style.display = 'none';
                document.getElementById('conditioningInputs').style.display = 'block';
                document.getElementById('currentExerciseDesc').textContent = 
                    'Enter distance after completion';
            }

            // Update next exercise display
            if (currentExerciseIndex + 1 < workoutPlan.length) {
                const nextExercise = workoutPlan[currentExerciseIndex + 1];
                document.getElementById('nextExerciseName').textContent = nextExercise.name;
                document.getElementById('nextExerciseDesc').textContent = 
                    nextExercise.type === 'strength' ? 
                    `${nextExercise.sets} sets x ${nextExercise.reps} reps` : 
                    'Conditioning';
                document.querySelector('.next-up').style.display = 'block';
            } else {
                document.querySelector('.next-up').style.display = 'none';
            }
        } else {
            // Workout completed
            alert('Workout completed! Great job!');
            localStorage.removeItem('workoutExercises'); // Clear the saved workout
            window.location.href = '/';
        }
    }
    
    async function completeCurrentExercise() {
        const currentExercise = workoutPlan[currentExerciseIndex];
        let exerciseData;

        if (currentExercise.type === 'strength') {
            const weight = document.getElementById('weightInput').value;
            
            if (currentSet >= currentExercise.sets) {
                // Complete exercise logic for strength training
                addToCompletedList(currentExercise, weight);
                currentSet = 1;
                currentExerciseIndex++;
            } else {
                currentSet++;
            }

            exerciseData = {
                name: currentExercise.name,
                type: 'strength',
                set: currentSet - 1,
                reps: reps,
                weight: parseFloat(weight)
            };
        } else if (currentExercise.type === 'conditioning') {
            const distance = document.getElementById('distanceInput').value;
            
            addToCompletedList(currentExercise, null, distance);
            currentExerciseIndex++;

            exerciseData = {
                name: currentExercise.name,
                type: 'conditioning',
                distance: parseFloat(distance)
            };
        }

        await logExercise(exerciseData);
        updateExerciseDisplay();
    }

    // Helper function to add completed exercise to the list
    function addToCompletedList(exercise, weight = null, distance = null) {
        const completedExercisesList = document.getElementById('completedExercises');
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item completed';

        const details = exercise.type === 'strength' ?
            `${exercise.sets} sets completed, ${weight}kg` :
            `Distance: ${distance}km`;

        listItem.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>
                    <h6>${exercise.name}</h6>
                    <small class="text-muted">${details}</small>
                </div>
                <div>✓</div>
            </div>
        `;
        completedExercisesList.appendChild(listItem);
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

    document.getElementById('startWorkoutBtn').addEventListener('click', function() {
        console.log('Saving exercises:', selectedExercises); // Debug log
        localStorage.setItem('workoutExercises', JSON.stringify(selectedExercises));
        console.log('Saved to localStorage:', localStorage.getItem('workoutExercises')); // Verify save
        window.location.href = '/workout';
    });

