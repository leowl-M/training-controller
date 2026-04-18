// Alias di Matter.js
const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Constraint = Matter.Constraint;

let engine, world;
let logicalW = 1080;
let logicalH = 1440;
let cnv;

// Settings Lettere & Effetti
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?#%&@*+".split('');
const fonts = ['Arial', 'Courier New', 'Times New Roman', 'Georgia', 'Verdana'];
const animations = ['Static', 'Pulse', 'Spin'];
const effects = ['Nessuno', 'Distorsione', 'Morphing', 'Gravità'];
const blendModeNames = ['Normale', 'Moltiplica', 'Scolora', 'Sovrapponi', 'Differenza', 'Esclusione'];

let blendModeValues; 
let isRecordingGif = false; 

let cursorState = {
  x: logicalW / 2, y: logicalH / 4,
  charIdx: 0, fontIdx: 0,
  animIdx: 0, effectIdx: 0, blendIdx: 0,
  colorVal: '#ffffff', // Usa stringhe HEX nativamente ora!
  size: 150, weight: 0, 
  rot: 0, sx: 1.0, sy: 1.0,
  snapGrid: false
};

let placedGroups = []; 
let boundaries = [];
let prevButtons = [];
let gpIndex = null;

function setup() {
  const wrap = document.getElementById('canvasWrap');
  cnv = createCanvas(logicalW, logicalH);
  cnv.parent('canvasWrap');
  pixelDensity(1);
  
  blendModeValues = [BLEND, MULTIPLY, SCREEN, OVERLAY, DIFFERENCE, EXCLUSION];

  engine = Engine.create();
  world = engine.world;
  createBoundaries();
  
  new ResizeObserver(() => fitCanvas()).observe(wrap.parentElement);
  fitCanvas();
  
  textAlign(CENTER, CENTER);
  updateHUD();
}

function createBoundaries() {
  boundaries.forEach(b => World.remove(world, b));
  boundaries = [];
  let thickness = 500;
  let ground = Bodies.rectangle(logicalW/2, logicalH + thickness/2, logicalW * 2, thickness, { isStatic: true });
  let wallL = Bodies.rectangle(0 - thickness/2, logicalH/2, thickness, logicalH * 2, { isStatic: true });
  let wallR = Bodies.rectangle(logicalW + thickness/2, logicalH/2, thickness, logicalH * 2, { isStatic: true });
  boundaries.push(ground, wallL, wallR);
  World.add(world, boundaries);
}

// Funzione chiamata dall'event listener in HTML
function updateColorFromPicker(hexString) {
  cursorState.colorVal = hexString;
}

// GESTIONE DEL RENDER
function renderWorld(isExporting) {
  background(10); // Disegna sempre lo sfondo scuro (#0a0a0a)

  blendMode(blendModeValues[cursorState.blendIdx]);

  for (let g of placedGroups) {
    for (let p of g.items) {
      push();
      let px = p.x;
      let py = p.y;
      let prot = p.rot;
      
      if (g.isPhysical && p.body) {
        px = p.body.position.x;
        py = p.body.position.y;
        prot = degrees(p.body.angle);
      }
      
      translate(px, py);
      let time = millis() - p.placedTime;

      if (p.animIdx === 1) scale(map(sin(time*0.005), -1, 1, 0.8, 1.2));
      if (p.animIdx === 2) rotate(radians(time*0.1));

      if (p.effectIdx === 1) {
        shearX(sin(time*0.005)*0.4);
        shearY(cos(time*0.003)*0.4);
      } else if (p.effectIdx === 2) {
        let nx = noise(time*0.002, 0)*2-1; 
        let ny = noise(0, time*0.002)*2-1;
        scale(1+nx*0.6, 1+ny*0.6);
      }
      
      rotate(radians(prot));
      scale(p.sx, p.sy);
      
      textFont(p.font);
      textSize(p.size);
      
      // p5.js accetta stringhe hex ('#ffffff') senza problemi in fill() e stroke()
      fill(p.colorVal);
      
      if (p.weight > 0) {
        stroke(p.colorVal);
        strokeWeight(p.weight);
        strokeJoin(ROUND);
      } else {
        noStroke();
      }
      
      text(p.char, 0, 0);
      pop();
    }
  }
  
  blendMode(BLEND);

  // Nascondi wireframe gialla durante l'export
  if (!isExporting && gpIndex !== null) {
    drawWireframeCursor();
  }
}

function draw() {
  handleGamepad();
  Engine.update(engine);
  renderWorld(isRecordingGif); 
}

function drawWireframeCursor() {
  push();
  translate(cursorState.x, cursorState.y);
  
  let time = millis();
  if (cursorState.animIdx === 1) scale(map(sin(time*0.005), -1, 1, 0.8, 1.2));
  if (cursorState.animIdx === 2) rotate(radians(time*0.1));
  if (cursorState.effectIdx === 1) { shearX(sin(time*0.005)*0.4); shearY(cos(time*0.003)*0.4); }
  if (cursorState.effectIdx === 2) { scale(1+(noise(time*0.002, 0)*2-1)*0.6, 1+(noise(0, time*0.002)*2-1)*0.6); }
  
  rotate(radians(cursorState.rot));
  scale(cursorState.sx, cursorState.sy);
  
  let textToDrop = document.getElementById('wordInput').value || 'A';
  let spacing = cursorState.size * 0.6; 
  let startX = -(textToDrop.length - 1) * spacing / 2;

  textFont(fonts[cursorState.fontIdx]);
  textSize(cursorState.size);
  textAlign(CENTER, CENTER);
  
  stroke('#ffff00'); 
  strokeJoin(ROUND);
  
  let currentScaleFactor = max(cursorState.sx, cursorState.sy);
  if (cursorState.weight > 0) {
    strokeWeight(cursorState.weight);
  } else {
    strokeWeight(2 / currentScaleFactor); 
  }
  noFill(); 
  
  for(let i = 0; i < textToDrop.length; i++) {
    push();
    translate(startX + i * spacing, 0);
    
    let w = cursorState.size * 0.7;
    let h = cursorState.size * 0.8;
    rectMode(CENTER);
    drawingContext.setLineDash([10 / currentScaleFactor, 10 / currentScaleFactor]);
    rect(0, -h*0.1, w, h);
    drawingContext.setLineDash([]); 

    text(textToDrop[i], 0, 0);
    pop();
  }
  
  pop();
  
  if (cursorState.snapGrid) {
    stroke(255, 30);
    strokeWeight(1);
    line(cursorState.x, 0, cursorState.x, height);
    line(0, cursorState.y, width, cursorState.y);
  }
}

function placeWord() {
  let textToDrop = document.getElementById('wordInput').value || 'A';
  let isPhysical = (cursorState.effectIdx === 3); 
  
  let spacing = cursorState.size * 0.6 * cursorState.sx;
  let startX = cursorState.x - (textToDrop.length - 1) * spacing / 2;

  let newGroup = {
    isPhysical: isPhysical,
    items: [],
    constraints: []
  };

  let prevBody = null;

  for(let i = 0; i < textToDrop.length; i++) {
    let charStr = textToDrop[i];
    let bx = startX + i * spacing;
    let by = cursorState.y;
    
    let body = null;
    if (isPhysical) {
      let w = cursorState.size * 0.7 * cursorState.sx;
      let h = cursorState.size * 0.8 * cursorState.sy;
      body = Bodies.rectangle(bx, by - h*0.1, w, h, {
        angle: radians(cursorState.rot),
        restitution: 0.3, friction: 0.5, density: 0.05
      });
      World.add(world, body);

      if (prevBody) {
        let joint = Constraint.create({
          bodyA: prevBody,
          bodyB: body,
          stiffness: 0.4, 
          damping: 0.1,
          length: spacing 
        });
        World.add(world, joint);
        newGroup.constraints.push(joint);
      }
      prevBody = body;
    }

    newGroup.items.push({
      char: charStr,
      x: bx, y: by,
      font: fonts[cursorState.fontIdx],
      colorVal: cursorState.colorVal, // Stringa HEX salvata
      size: cursorState.size,
      weight: cursorState.weight,
      rot: cursorState.rot,
      sx: cursorState.sx, sy: cursorState.sy,
      animIdx: cursorState.animIdx,
      effectIdx: cursorState.effectIdx,
      placedTime: millis(),
      body: body
    });
  }

  placedGroups.push(newGroup);
  toast(isPhysical && textToDrop.length > 1 ? "Catena fisica droppata!" : "Testo piazzato!");
}

function handleGamepad() {
  let gamepads = navigator.getGamepads();
  let gp = null;
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) { gp = gamepads[i]; gpIndex = i; break; }
  }
  if (!gp) return;
  
  let deadzone = 0.15;
  
  let speed = (logicalW / 1080) * 15; 
  if (abs(gp.axes[0]) > deadzone) cursorState.x += gp.axes[0] * speed;
  if (abs(gp.axes[1]) > deadzone) cursorState.y += gp.axes[1] * speed;
  cursorState.x = constrain(cursorState.x, 0, logicalW);
  cursorState.y = constrain(cursorState.y, 0, logicalH);
  
  if (cursorState.snapGrid) {
    cursorState.x = round(cursorState.x / 50) * 50;
    cursorState.y = round(cursorState.y / 50) * 50;
  }
  
  if (abs(gp.axes[2]) > deadzone) cursorState.sx = constrain(cursorState.sx + gp.axes[2] * 0.1, 0.01, 50);
  if (abs(gp.axes[3]) > deadzone) cursorState.sy = constrain(cursorState.sy + gp.axes[3] * 0.1, 0.01, 50);
  
  if (gp.buttons[6].value > 0.1) cursorState.rot -= gp.buttons[6].value * 5;
  if (gp.buttons[7].value > 0.1) cursorState.rot += gp.buttons[7].value * 5;
  
  for (let i = 0; i < gp.buttons.length; i++) {
    let pressed = gp.buttons[i].pressed;
    if (pressed && !prevButtons[i]) onGamepadButtonDown(i);
    prevButtons[i] = pressed;
  }
  updateHUD();
}

function onGamepadButtonDown(btn) {
  switch(btn) {
    case 0: placeWord(); break; 
    case 1: 
      if (placedGroups.length > 0) {
        let g = placedGroups.pop();
        if (g.isPhysical) {
          g.items.forEach(item => { if(item.body) World.remove(world, item.body); });
          g.constraints.forEach(c => World.remove(world, c));
        }
      }
      break;
    case 2: cursorState.fontIdx = (cursorState.fontIdx + 1) % fonts.length; break; 
    case 3: cursorState.animIdx = (cursorState.animIdx + 1) % animations.length; break; 
    case 4: 
      cursorState.charIdx = (cursorState.charIdx - 1 + chars.length) % chars.length; 
      document.getElementById('wordInput').value = chars[cursorState.charIdx];
      break; 
    case 5: 
      cursorState.charIdx = (cursorState.charIdx + 1) % chars.length; 
      document.getElementById('wordInput').value = chars[cursorState.charIdx];
      break; 
    case 8: clearAll(); break; 
    case 9: saveSketch(); break; 
    
    case 10: 
      cursorState.blendIdx = (cursorState.blendIdx + 1) % blendModeNames.length;
      toast("Fusione: " + blendModeNames[cursorState.blendIdx]);
      break;

    case 11: 
      cursorState.snapGrid = !cursorState.snapGrid;
      toast(cursorState.snapGrid ? "Snap Griglia ON" : "Snap Griglia OFF");
      break;
    
    case 12: cursorState.size = constrain(cursorState.size + 20, 10, 5000); break; 
    case 13: cursorState.size = constrain(cursorState.size - 20, 10, 5000); break; 
    case 14: cursorState.weight = constrain(cursorState.weight - 5, 0, 500); break; 
    case 15: cursorState.weight = constrain(cursorState.weight + 5, 0, 500); break; 

    case 17: 
      cursorState.effectIdx = (cursorState.effectIdx + 1) % effects.length;
      toast("Effetto: " + effects[cursorState.effectIdx]);
      break;
  }
}

function saveSketch() {
  renderWorld(true); 
  saveCanvas(cnv, `typo-export-${logicalW}x${logicalH}`, 'png');
  toast('Immagine PNG esportata in HD!');
}

function saveGifExport() {
  isRecordingGif = true; 
  toast('Registrazione GIF iniziata (3 sec)...');
  
  saveGif(`typo-anim-${logicalW}x${logicalH}`, 3, { units: "seconds" });
  
  setTimeout(() => {
    isRecordingGif = false;
    toast('GIF Salvata con successo!');
  }, 3200);
}

function clearAll() {
  placedGroups.forEach(g => { 
    if (g.isPhysical) {
      g.items.forEach(item => { if(item.body) World.remove(world, item.body); });
      g.constraints.forEach(c => World.remove(world, c));
    }
  });
  placedGroups = [];
  toast('Canvas svuotato completamente');
}

function fitCanvas() {
  const wrap = document.getElementById('canvasWrap');
  if(!wrap || !wrap.parentElement) return;
  const scaleRatio = Math.min((wrap.parentElement.clientWidth - 40) / logicalW, (wrap.parentElement.clientHeight - 40) / logicalH);
  wrap.style.width = `${logicalW}px`;
  wrap.style.height = `${logicalH}px`;
  wrap.style.transform = `scale(${scaleRatio})`;
  wrap.style.transformOrigin = 'center center';
}

function changeResolution(w, h) {
  logicalW = w; logicalH = h;
  resizeCanvas(w, h);
  cursorState.x = logicalW / 2; cursorState.y = logicalH / 4;
  createBoundaries();
  clearAll();
  fitCanvas();
  document.getElementById('hud-res-label').textContent = `${w}x${h}`;
}

function updateHUD() {
  const $ = id => document.getElementById(id);
  if(!$('hud-font')) return; 
  
  $('hud-font').textContent = fonts[cursorState.fontIdx];
  $('hud-anim').textContent = animations[cursorState.animIdx];
  $('hud-effect').textContent = effects[cursorState.effectIdx];
  $('hud-blend').textContent = blendModeNames[cursorState.blendIdx];
  
  // Il colore ora è gestito solo via picker, non viene sovrascritto
  $('hud-size').textContent = cursorState.size;
  $('hud-weight').textContent = cursorState.weight;
  $('hud-rot').textContent = Math.round(cursorState.rot) + '°';
  $('hud-sx').textContent = cursorState.sx.toFixed(2);
  $('hud-sy').textContent = cursorState.sy.toFixed(2);
  
  $('hud-count').textContent = placedGroups.length;
}