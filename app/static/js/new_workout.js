document.addEventListener('DOMContentLoaded', function() {
    let selectedExercises = [];
    const exerciseList = {
        strength: [
            { id: 'bench', name: 'Bench Press', type: 'strength' },
            { id: 'squat', name: 'Squat', type: 'strength' },
            { id: 'deadlift', name: 'Deadlift', type: 'strength' },
            { id: 'barbell_row', name: 'Barbell Row', type: 'strength' },
            { id: 'pullup', name: 'Pull-up', type: 'strength' },
            { id: 'pushup', name: 'Push-up', type: 'strength' }
        ],
        conditioning: [
            { id: 'run', name: 'Running', type: 'conditioning' }
        ]
    };

    // Populate exercise selection cards
    function populateExercises() {
        const strengthContainer = document.getElementById('strengthExercises');
        const conditioningContainer = document.getElementById('conditioningExercises');

        exerciseList.strength.forEach(exercise => {
            const card = createExerciseCard(exercise);
            strengthContainer.appendChild(card);
        });

        exerciseList.conditioning.forEach(exercise => {
            const card = createExerciseCard(exercise);
            conditioningContainer.appendChild(card);
        });
    }

    function createExerciseCard(exercise) {
        const div = document.createElement('div');
        div.className = 'col-md-4 mb-3';
        div.innerHTML = `
            <div class="card exercise-card" data-exercise-id="${exercise.id}">
                <div class="card-body">
                    <h5 class="card-title">${exercise.name}</h5>
                    <p class="card-text">${exercise.type}</p>
                </div>
            </div>
        `;

        div.querySelector('.exercise-card').addEventListener('click', () => {
            toggleExerciseSelection(exercise, div.querySelector('.exercise-card'));
        });

        return div;
    }

    function toggleExerciseSelection(exercise, card) {
        const index = selectedExercises.findIndex(e => e.id === exercise.id);
        
        if (index === -1) {
            selectedExercises.push(exercise);
            card.classList.add('selected');
        } else {
            selectedExercises.splice(index, 1);
            card.classList.remove('selected');
        }

        // Enable/disable start button based on selection
        document.getElementById('startWorkoutBtn').disabled = selectedExercises.length === 0;
        updateSelectedList();
    }

    function updateSelectedList() {
        const list = document.getElementById('selectedExercises');
        list.innerHTML = '';
        selectedExercises.forEach(exercise => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = exercise.name;
            list.appendChild(li);
        });
    }

    // Start workout button handler
    document.getElementById('startWorkoutBtn').addEventListener('click', function() {
        if (selectedExercises.length > 0) {
            console.log('Saving exercises:', selectedExercises);
            localStorage.setItem('workoutExercises', JSON.stringify(selectedExercises));
            window.location.href = '/workout';
        }
    });

    // Initialize the page
    populateExercises();
});