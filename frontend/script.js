// --- Setup ---
// --- Color toolbar setup ---
const toolbar = document.getElementById("color-toolbar");
const addColorBtn = document.getElementById("add-color");

const groups = []; // starting colors
let activeColor = null;


/**
 * Render the groups on th etoolbar
 */
function renderGroups() {
  toolbar.innerHTML = "";

  groups.forEach((group, index) => {
    //Create element and style
    const container = document.createElement("div");
    container.className = "group-item";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.gap = "4px";
    container.style.cursor = "pointer";

    //Create swatch and label
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.background = group.color;

    const label = document.createElement("div");
    label.textContent = group.name;
    label.style.fontSize = "12px";

    // Add click logic -- double click to edit, single click to select
    container.addEventListener("dblclick", () => openGroupEditor(index));
    container.addEventListener("click", () => {
      activeColor = group.color; 
            document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
    })

    toolbar.appendChild(container);
    container.appendChild(swatch);
    container.appendChild(label);
  });
}


function openGroupEditor(index = null) {
  const overlay = document.createElement("div"); //gray out background
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 2000;

  const popup = document.createElement("div"); //popup container
  popup.style.background = "white";
  popup.style.padding = "16px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.gap = "8px";
  popup.style.width = "220px";

  const title = document.createElement("h3"); //title of popup
  title.textContent = index === null ? "New Group" : "Edit Group";
  title.style.margin = "0 0 8px 0";

  const nameInput = document.createElement("input"); //name input
  nameInput.type = "text";
  nameInput.placeholder = "Group name";
  nameInput.value = index !== null ? groups[index].name : "";

  const colorInput = document.createElement("input"); //color swatch editor
  colorInput.type = "color";
  colorInput.value = index !== null ? groups[index].color : "#000000";

  const populationDisplay = document.createElement("div"); //population display (calculated from administrative subdivsisions assigned)
  populationDisplay.textContent = `Population: ${
    index !== null ? groups[index].population : 0
  }`;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";

  saveBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const color = colorInput.value;

    if (!name) { //if no name entered, alert and return
      alert("Please enter a group name.");
      return;
    }

    if (index === null) { 
      groups.push({ name, color, population: 0 }); //new group
    } else { //edit group
      groups[index].name = name;
      groups[index].color = color;
    }

    renderGroups();
    document.body.removeChild(overlay);
  });

  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  popup.appendChild(title);
  popup.appendChild(nameInput);
  popup.appendChild(colorInput);
  popup.appendChild(populationDisplay);
  popup.appendChild(saveBtn);
  popup.appendChild(cancelBtn);

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}


addColorBtn.addEventListener("click", () => {
  openGroupEditor();
});


// render initial colors
//renderColors();


const map = L.map('map', {
  zoomControl: true,
  attributionControl: false,
  minZoom: 4,
  maxZoom: 12
}).setView([47.5, 10.5], 6);

// Store selected groups
let activeGroup = null;     // currently selected group name
const colors = {};          // featureID -> color mapping


// --- Load GeoJSONs ---
Promise.all([
  fetch('geoboundaries/geoBoundaries-AUT-ADM1-all/geoBoundaries-AUT-ADM1.geojson').then(r => r.json()),
  fetch('geoboundaries/geoBoundaries-CHE-ADM1-all/geoBoundaries-CHE-ADM1.geojson').then(r => r.json()),
  fetch('geoboundaries/geoBoundaries-DEU-ADM1-all/geoBoundaries-DEU-ADM1.geojson').then(r => r.json())
])
  .then(([aut, che, deu]) => {
    const styleDefault = { color: '#333', weight: 1, fillOpacity: 0.2 };

    const allLayers = [aut, che, deu].map(geo =>
      L.geoJSON(geo, {
        style: styleDefault,
        onEachFeature: (feature, layer) => {
          const id = feature.properties.shapeID || feature.properties.GID_1 || JSON.stringify(feature.geometry);
          layer.setStyle({ color: '#333', fillOpacity: 0.6, weight: 1 });
          activeColor = null;

          // --- Click to toggle group assignment ---
          layer.on('click', () => {
            if (!activeGroup) return;

            const alreadyInGroup = groups[activeGroup].includes(id);
            console.log(layer.options.fillColor, activeColor);
            if (activeColor === null) return; // no color selected
            if (layer.options.fillColor === activeColor) {
              layer.setStyle({ color: '#333', fillColor: '#333', fillOpacity: 0.6, weight: 1 });
            } else {
              // assign
              groups[activeGroup].push(id);
              colors[id] = color;
              layer.setStyle({ color: '#333', fillColor: activeColor, fillOpacity: 0.6, weight: 1 });
            }

            console.log(groups);
          });

          // --- Hover effect for feedback ---
          layer.on('mouseover', e => e.target.setStyle({ weight: 2 }));
          layer.on('mouseout', e => e.target.setStyle({ weight: 1 }));
        }
      }).addTo(map)
    );

    // Fit to all countries
    const group = L.featureGroup(allLayers);
    map.fitBounds(group.getBounds());
  })
  .catch(err => console.error('GeoJSON load error:', err));
