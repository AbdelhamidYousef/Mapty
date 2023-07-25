import 'core-js';

// DOM Elements
const workoutsContainer = document.getElementById('workouts-container'),
  workoutForm = document.getElementById('workout-form'),
  typeInp = document.getElementById('type-input'),
  distanceInp = document.getElementById('distance-input'),
  durationInp = document.getElementById('duration-input'),
  cadenceInp = document.getElementById('cadence-input'),
  elevationInp = document.getElementById('elevation-input'),
  resetBtn = document.getElementById('reset-btn');

// Workout Classes
class Workout {
  #date = new Date();
  id = Date.now().toString().slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    const type = `${this.type.at(0).toUpperCase()}${this.type.slice(1)}`,
      date = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
      }).format(this.#date);

    this.description = `${type} on ${date}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this._setDescription();
    this._setPace();
  }

  _setPace() {
    this.pace = +(this.duration / this.distance).toFixed(1);
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;

    this._setDescription();
    this._setSpeed();
  }

  _setSpeed() {
    this.speed = +(this.distance / (this.duration / 60)).toFixed(1);
  }
}

// Application Class
class App {
  #map;
  #mapZoomLvl = 15;
  #clickCoords;
  #workouts = [];

  constructor() {
    // 1st
    this._getCurrentLocation();
    // 2nd
    this._getLocalStorage();
    // 3rd
    typeInp.addEventListener('change', this._toggleInputs);
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || workoutForm.classList.contains('hidden'))
        return;
      workoutForm.classList.add('hidden');
    });
    // 4th
    workoutForm.addEventListener('submit', this._newWorkout.bind(this));
    // 5th
    workoutsContainer.addEventListener('click', this._movetoMarker.bind(this));
    // 6th
    resetBtn.addEventListener('click', this._clearWorkouts.bind(this));
  }

  // 1st
  _getCurrentLocation() {
    // Checking for geolocation
    if (!navigator.geolocation)
      return alert("Couldn't get your current location");
    // Getting current coords
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const coords = [lat, lng];
        // Calling renderMap
        this._renderMap(coords);
      },
      () => alert("Couldn't get your current location")
    );
  }

  _renderMap(coords) {
    // Rendering map
    this.#map = L.map('map').setView(coords, this.#mapZoomLvl);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    // Render markers from local storage
    this.#workouts.forEach(workout => this._renderMarker(workout));

    // Map click event
    this.#map.on('click', mapEvent => {
      // Getting map click coordination
      const { lat, lng } = mapEvent.latlng;
      this.#clickCoords = [lat, lng];
      // Calling showForm
      this._showForm();
    });
  }

  _showForm() {
    workoutForm.classList.remove('hidden');
    distanceInp.focus();
  }

  // 2nd
  _getLocalStorage() {
    if (!localStorage.getItem('workouts')) return;

    this.#workouts = JSON.parse(localStorage.getItem('workouts'));

    this.#workouts.forEach(workout => {
      this._renderEntry(workout);
    });
  }

  // 3rd
  _toggleInputs() {
    [cadenceInp, elevationInp].forEach(inp =>
      inp.closest('.form__row').classList.toggle('form__row--hidden')
    );
  }

  // 4th
  _newWorkout(e) {
    e.preventDefault();
    // Validation functions
    const positiveValues = function (...inputs) {
      return inputs.every(inp => inp > 0);
    };
    const finiteValues = function (...inputs) {
      return inputs.every(inp => isFinite(inp));
    };

    // Getting & validating inputs & Creating the new workout
    const type = typeInp.value,
      distance = +distanceInp.value,
      duration = +durationInp.value;
    let workout;

    //   For running workout
    if (type === 'running') {
      const cadence = +cadenceInp.value;

      if (!positiveValues(distance, duration, cadence))
        return alert('Inputs have to be positive numbers');

      workout = new Running(this.#clickCoords, distance, duration, cadence);
    }

    //   For cycling workout
    if (type === 'cycling') {
      const elevation = +elevationInp.value;

      if (!positiveValues(distance, duration))
        return alert('Distance and duration have to be positive numbers');
      if (!finiteValues(elevation)) return alert('Elevation have to a number');

      workout = new Cycling(this.#clickCoords, distance, duration, elevation);
    }

    // Pushing the new workout & Saving workouts in localStorage
    this.#workouts.push(workout);
    this._setLocalStorage();
    // Hiding Form & Rendering workout entry
    this._hideForm();
    this._renderEntry(workout);
    // Rendering workout marker
    this._renderMarker(workout);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _hideForm() {
    // Clearing inputs
    distanceInp.value =
      durationInp.value =
      cadenceInp.value =
      elevationInp.value =
        '';

    // Removing form with display (to prevent transition)
    workoutForm.style.display = 'none';
    setTimeout(() => (workoutForm.style.display = 'grid'), 500);

    // Hiding form
    workoutForm.classList.add('hidden');
  }

  _renderEntry(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">
            ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
          </span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;

    workoutForm.insertAdjacentHTML('afterend', html);
  }

  _renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // 5th
  _movetoMarker(e) {
    // In case the map hasn't been loaded yet
    if (!this.#map) return;

    // Validating the clicked area
    const clickedEntry = e.target.closest('.workout');
    if (!clickedEntry) return;

    // Getting the entry's workout
    const clickedWorkout = this.#workouts.find(
      workout => workout.id === clickedEntry.dataset.id
    );

    // Moving on map
    this.#map.setView(clickedWorkout.coords, this.#mapZoomLvl, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // 6th
  _clearWorkouts() {
    // Clear entries
    workoutsContainer.querySelectorAll('.workout').forEach(el => {
      el.style.opacity = 0;
      setTimeout(() => el.remove(), 300);
    });

    // Clear markers
    this.#map.remove();
    this._getCurrentLocation();

    // Clear workouts variable in class & local storage
    this.#workouts = [];
    if (localStorage.getItem('workouts')) localStorage.removeItem('workouts');
  }
}
const app = new App();
