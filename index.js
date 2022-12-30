/* eslint-disable */

const thumbTip = 4;
const indexTip = 8; 
const middleTip = 12; 
const ringTip = 16;
const pinkyTip = 20;

const indexMcp = 5;
const middleMcp = 9;
const ringMcp = 13;
const pinkyMcp = 17;

const posibleGestures = ['Thumb_Index','Thumb_Middle','Thumb_Ring','Thumb_Pinky'];
const posibleHandPositions = ['palmFacing', 'dorsalFacing'];

var lastGestureDetected = '';
var timesDetectedLastGesture = 0;

const createAndTrainBtn = document.querySelector("#createAndTrainBtn");
const testModelBtn = document.querySelector("#testModelBtn");
const loadModelBtn = document.querySelector("#loadModelBtn");
const micStartBtn = document.querySelector("#micStartBtn");
const micStopBtn = document.querySelector("#micStopBtn");
const recNoiseBtn = document.querySelector("#recNoiseClass");



const audioPlayer = document.querySelector("#audioPlayer");

const defineClasesBtn = document.querySelector("#defineClasesForPrediction");
const addElementToListBtn = document.querySelector("#adder");
const startsRecordingAudiosBtn = document.querySelector("#recorder");

const firstClassRecorder = document.querySelector("#recFirstClass");
const secondClassRecorder = document.querySelector("#recSecondClass");
const thirdClassRecorder = document.querySelector("#recThirdClass");

const minimumRecords = 7;

var currentEnabledButton = null;
var middleFingerButton = null;
var ringFingerButton = null;
var pinkyFingerButton = null;

var loadedVSCreated = 'Created';

const classificationAudioThreshold = 0.95;
const realClassificationAudioThreshold = 0.8;

/* El código está escrito así con fines educativos. 
 * No es el código que usaríamos en producción
 */
const MODEL_URL = "https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1";

/* 
 * Parámetros para la creación del modelo
 */
const INPUT_SHAPE = 1024;
const NUM_CLASSES = 4;

/* 
 * Parámetros para el procesamiento de audio
 */
const MODEL_SAMPLE_RATE = 16000; // Frecuencia de muestreo para YAMNet
const NUM_SECONDS = 3; // Número de segundos para el muestreo desde mic
const OVERLAP_FACTOR = 0.0; // Factor de superposición de los fotogramas

const iconClasses = ['baby','dog','fridge','hood','microwave','vacuum','noise','cat'];
const CLASSES = ["microwave", "hood", "fridge", "noise"];

var CUSTOM_CLASSES = [];
var recorded_data = [[],[],[],[]];
var custom_training_data = [];
var custom_test_data = [];



function flattenQueue(queue) {
    const frameSize = queue[0].length;
    const data = new Float32Array(queue.length * frameSize); 
    queue.forEach((d, i) => data.set(d, i * frameSize));
    return data;
}

let model;
let yamnet;

async function app() {
 
    let audioContext;
    let stream;

    const timeDataQueue = [];

    var trainDataArray = '';
    var testDataArray = '';

    substituteMinNumber();
    
    enableButton(defineClasesBtn,true, changeColor = '#adedb0');
    currentEnabledButton = defineClasesBtn;
    enableButton(loadModelBtn, true, changeColor = '#8accf2');
    middleFingerButton = loadModelBtn;

    enableButton(addElementToListBtn,false);
    enableButton(startsRecordingAudiosBtn,false);

    enableButton(firstClassRecorder,false);
    enableButton(secondClassRecorder,false);
    enableButton(thirdClassRecorder,false);

    enableButton(createAndTrainBtn, false);
    
    enableButton(recNoiseBtn, false);

    enableButton(testModelBtn, false);
    enableButton(micStartBtn, false);
    enableButton(micStopBtn, false);

    yamnet = await loadYamnetModel();
    

    var input = document.getElementById("class");
    input.addEventListener("keypress", function(event) {
      
        if (event.key === "Enter") {
          event.preventDefault();
          addElementToListBtn.click();
        }
      });

    defineClasesBtn.onclick = function () {
        document.getElementById("declareClassesDiv").style.display = "inline";
        enableButton(addElementToListBtn,true,  changeColor = '#adedb0');
        currentEnabledButton = addElementToListBtn;
        document.querySelector('#infoClasses').style.display = 'block';
        enableButton(defineClasesBtn,false);
        enableButton(loadModelBtn,false)
    }

    addElementToListBtn.onclick = function() {
       
        var list = document.querySelector("#classList");
        var text = document.getElementById("class").value; 
        var current_values = list.getElementsByTagName("li");

        if(current_values.length >=3){
            console.log("Maximum value of elements reached");
            return 
        }else  if (text == ""){
            console.log("Empty class name not valid");
            return
        }

        var classes_array = [];

        for(var i = 0; i < current_values.length; i++){
            classes_array.push(current_values[i].textContent);
        }

        if(classes_array.includes(text)){
            console.log("Class already declared, try another class name");
            return
        }
    
        var node = document.createElement("Li");
        var textnode=document.createTextNode(text);
        var image = document.createElement('img');

        if (iconClasses.includes(text)){
            var src = './icons/'+ text +'.png'
        }else {var src = './icons/defaultClass.png' }

        image.setAttribute('src',src);
        image.classList.add('smallIcon');
        node.appendChild(textnode);
        node.classList.add('textClass');
        node.appendChild(image);
        list.appendChild(node);

        document.getElementById("class").value = '';
        current_values = list.getElementsByTagName("li");
        if(current_values.length >=3){
            enableButton(addElementToListBtn, false);
            enableButton(startsRecordingAudiosBtn, true, changeColor = '#adedb0');
            currentEnabledButton = startsRecordingAudiosBtn;
        }
    }

    startsRecordingAudiosBtn.onclick = function (){
        var all_clases = document.querySelector("#classList").getElementsByTagName("li");
        if (all_clases.length < 3){
            console.log("No suficient classes");
            return
        }
    
        for(var i = 0; i < all_clases.length; i++){
            CUSTOM_CLASSES.push(all_clases[i].textContent);
        }
        CUSTOM_CLASSES.push('noise');

        firstClassRecorder.textContent = "Record "+ all_clases[0].textContent +" class";
        secondClassRecorder.textContent = "Record "+ all_clases[1].textContent +" class";
        thirdClassRecorder.textContent = "Record "+ all_clases[2].textContent +" class";

        document.getElementById(posibleGestures[0]+ "Btn").textContent += " (" + all_clases[0].textContent + ")";
        document.getElementById(posibleGestures[1]+ "Btn").textContent += " (" + all_clases[1].textContent + ")";
        document.getElementById(posibleGestures[2]+ "Btn").textContent += " (" + all_clases[2].textContent + ")";
        document.getElementById(posibleGestures[3]+ "Btn").textContent += "(noise)";

        document.getElementById("recordClassesDiv").style.display = "inline";

        enableButton(firstClassRecorder, true, '#adedb0');
        currentEnabledButton = firstClassRecorder;
        enableButton(secondClassRecorder, true, '#8accf2');
        middleFingerButton = secondClassRecorder;
        enableButton(thirdClassRecorder, true, '#f5d390');
        ringFingerButton = thirdClassRecorder;
        enableButton(recNoiseBtn,true, '#dc9cf7');
        pinkyFingerButton = recNoiseBtn;
        enableButton(startsRecordingAudiosBtn,false);

        document.querySelector('#infoClasses').style.display = 'none';
        document.querySelector('#infoAudios').style.display = 'block';

        var numbers = document.getElementsByClassName("recordedNum");
        numbers.forEach(function(item,index){
            item.style.display = 'block';
        });



    }

    firstClassRecorder.onclick = function() {
        recordAudioCustomClass('First', 0);
    }

    secondClassRecorder.onclick = function() {
        recordAudioCustomClass('Second', 1);
    }

    thirdClassRecorder.onclick = function() {
        recordAudioCustomClass('Third', 2);
    }

    recNoiseBtn.onclick = async () => {
        recordAudioCustomClass('Noise', 3);
    };



    micStartBtn.onclick = async () => {

        stream = await getAudioStream();
        audioContext = new AudioContext({
            latencyHint: "playback",
            sampleRate: MODEL_SAMPLE_RATE
        });

        const streamSource = audioContext.createMediaStreamSource(stream);
        await audioContext.audioWorklet.addModule("recorder.worklet.js");
        const recorder = new AudioWorkletNode(audioContext, "recorder.worklet");
        streamSource.connect(recorder).connect(audioContext.destination);

        enableButton(micStartBtn, false);
        enableButton(testModelBtn, false);
        enableButton(micStopBtn, true, '#adedb0');
        currentEnabledButton = micStopBtn;
        middleFingerButton = null;

        recorder.port.onmessage =  async(e) => {
            const inputBuffer = Array.from(e.data);
            
            if (inputBuffer[0] === 0) return;

            timeDataQueue.push(...inputBuffer);

            const num_samples = timeDataQueue.length;
            if (num_samples >= MODEL_SAMPLE_RATE * NUM_SECONDS) {
                const audioData = new Float32Array(timeDataQueue.splice(0, MODEL_SAMPLE_RATE * NUM_SECONDS));
                var className = ''
                var classPredicted = await predict(yamnet, model, audioData,'real');
                console.log("Predicted: " + classPredicted);
                if(classPredicted >=0 && classPredicted <= 2){
                    if (loadedVSCreated == 'Loaded'){
                        className = CLASSES[classPredicted];
                    }else {className = CUSTOM_CLASSES[classPredicted];}
                    animateClass(className);
                }
            }
        }
    };

    micStopBtn.onclick = () => {
        if (!Boolean(audioContext) || !Boolean(stream)) return; 
        audioContext.close();
        audioContext = null;
      
        timeDataQueue.splice(0);
        if (stream != null && stream.getTracks().length > 0) {
            stream.getTracks()[0].stop();
            
            enableButton(micStopBtn, false);
            enableButton(testModelBtn, true, '#adedb0');
            currentEnabledButton =testModelBtn;
            enableButton(micStartBtn, true,'#8accf2');
            middleFingerButton = micStartBtn;
        }
    }


    loadModelBtn.onclick = async () => {
        model = await loadCustomAudioClassificationModelFromFile("./model/model.json");
        // trainDataArray = await (await fetch("data/trainData.json")).json();
        testDataArray = await (await fetch("data/testData.json")).json();
        loadedVSCreated = 'Loaded';
        
        enableButton(testModelBtn, true, '#adedb0');
        currentEnabledButton = testModelBtn;
        enableButton(micStartBtn, true, '#8accf2');
        middleFingerButton = micStartBtn;
        enableButton(loadModelBtn, false);
        enableButton(defineClasesBtn, false);
    }

    testModelBtn.onclick = async () => {
        if (loadedVSCreated =='Loaded'){
            testCustomAudioClassificationModel(yamnet, model, testDataArray,CLASSES);
        }else {
            testCustomAudioClassificationModel(yamnet, model, custom_test_data, CUSTOM_CLASSES);
        }
        
    };

    createAndTrainBtn.onclick = async () => {
        try {model = await createAndTrainCustomAudioClassificationModel(yamnet, custom_test_data);}
        catch(err){
            console.log('Error in train: try moving audio files to folder ("./data/audio"). \n \n'+err);
            return
        }
        
        document.querySelector('#infoTraning').style.display = 'none';
        enableButton(testModelBtn, true, '#adedb0');
        currentEnabledButton = testModelBtn;
        enableButton(micStartBtn, true, '#8accf2');
        middleFingerButton = micStartBtn;
        enableButton(createAndTrainBtn, false);
        enableButton(loadModelBtn, false);
        
    };
 

    var webcamElement = document.querySelector("#webcam");
    const webcam = await tf.data.webcam(webcamElement);

    const handPosemodel = handPoseDetection.SupportedModels.MediaPipeHands;
    const faceModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
    // const modelSegmenter = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;

    // const segmenterConfig = {
    //     runtime: 'mediapipe',
    //     solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation'
    //   };
    const detectorConfig = {
        maxHands : 1,
        runtime: 'tfjs',
        minDetectionConfidence : 0.8,
      };
    
    const faceDetectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
      };

    const detector = await handPoseDetection.createDetector(handPosemodel, detectorConfig);
    const faceDetector = await faceDetection.createDetector(faceModel, faceDetectorConfig);

    // const segmenter = await bodySegmentation.createSegmenter(modelSegmenter, segmenterConfig);

 
    while(true){
        const img = await webcam.capture();
        const estimationConfig = {flipHorizontal: true};
        const faceEstimationConfig = {flipHorizontal: false};
        const faces = await faceDetector.estimateFaces(img, faceEstimationConfig);
        // const segmentationConfig = {flipHorizontal: false};
        // const people = await segmenter.segmentPeople(img, segmentationConfig);
        

        if(faces.length > 0){
            const hands = await detector.estimateHands(img,estimationConfig);
        // Modificamos para solo entrar en el loop en función de una confianza superior a 97%
            if(hands.length > 0 && hands[0]['score'] >= 0.97){
                recogniceGesture(hands[0]['keypoints3D'], hands[0]['handedness']);
                
                if(timesDetectedLastGesture > 10){
                    timesDetectedLastGesture = 0;
                    document.getElementById(lastGestureDetected + "Btn").style.backgroundColor = '#edbaad';
                    if(lastGestureDetected == posibleGestures[0]){currentEnabledButton.click();}
                    else if (lastGestureDetected == posibleGestures[1] & middleFingerButton!= null){middleFingerButton.click();}
                    else if (lastGestureDetected == posibleGestures[2] & ringFingerButton != null){ringFingerButton.click();}
                    else if (lastGestureDetected == posibleGestures[3] & pinkyFingerButton != null){pinkyFingerButton.click();}
                    await sleep(1000);
                    document.getElementById(lastGestureDetected + "Btn").style.backgroundColor = '#EFEFEF';
                    
                    
                
                }
            }
        }
        
        img.dispose();
        await tf.nextFrame();
    }

}

function animateClass(className){
   
    const iconContainer = document.querySelector('#iconContainer');
    iconContainer.style.display = 'block';
    const backGround = document.querySelector('#blink');
    backGround.style.animation = 'blinkanimation 0.4s 2';
    setTimeout(() => {
        backGround.style.animation = '';
      }, "3000")
    const icon = document.querySelector('#iconRecognized');
    const iconName = document.querySelector('#iconName');
    if (iconClasses.includes(className)){
        icon.src = './icons/'+ className +'.png'
    }else {icon.src = './icons/defaultClass.png' }
    
    icon.style.animation = 'appear 1s 1';
    iconName.textContent = className;
    iconName.style.animation = 'fontappear 1s 1';
    setTimeout(() => {
        icon.style.animation = 'disappear 1s 1';
        iconName.style.animation = 'fontdisappear 1s 1';
      }, "4500")
      setTimeout(() => {
        icon.src = '';
        iconName.textContent = '??';
        iconContainer.style.display = 'none';
      }, "5500")
}

function downloadJson(fileName, data){
    const myJSON = JSON.stringify(data,null,'\t');
    let blob = new Blob([myJSON], {type: 'text/plain'});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName + '.json';
    link.click();
}

function substituteMinNumber(){

    var arr = ['infoAudios','recFirstClassNum','recSecondClassNum','recThirdClassNum','recNoiseClassNum']
    arr.forEach(function(item,index){
        var element = document.querySelector('#'+item);
        element.textContent = element.textContent.replace('xxnumberxx',minimumRecords);
    });
}

function prepareDateToTrain(){
    
  
    var min = 1000000;
    for(var i = 0; i < recorded_data.length; i++){
        if(recorded_data[i].length < min){min =recorded_data[i].length;}
    }
    var trainingSamples = Math.floor(min * 0.9);
    for(var i = 0; i < trainingSamples; i++){
        for (var j = 0; j < recorded_data.length; j++){
            custom_training_data.push({
                "fileName": recorded_data[j].shift(),
                "className": CUSTOM_CLASSES[j],
                "classNumber": j,
                "fold": "1"
            
            })
        }
    }

    for (var i = 0; i < recorded_data.length; i++){
        var notEmpty = true;
        while(notEmpty){
            custom_test_data.push({
                "fileName": recorded_data[i].shift(),
                "className": CUSTOM_CLASSES[i],
                "classNumber": i,
                "fold": "1"
            
            })
            if(recorded_data[i].length == 0){notEmpty = false;}
        }
    }
    downloadJson('trainData',custom_training_data);
    downloadJson('testData',custom_test_data);
    enableButton(createAndTrainBtn,true, '#adedb0');
    currentEnabledButton = createAndTrainBtn;
    enableButton(firstClassRecorder, false);
    enableButton(secondClassRecorder, false);
    enableButton(thirdClassRecorder, false);
    enableButton(recNoiseBtn,false);
    middleFingerButton = null; 
    ringFingerButton = null; 
    pinkyFingerButton = null;

    document.querySelector('#infoAudios').style.display = 'none';
    document.querySelector('#infoTraning').style.display = 'block';

    
}

async function recordAudioCustomClass(className, classNumber){
    
    var fileName = CUSTOM_CLASSES[classNumber] + "_" + Date.now() +  ".wav";
    recordCustomAudio(fileName,5);
    increaseClassCounter(className);
    recorded_data[classNumber].push(fileName);
    if(createAndTrainBtn.disabled & checkAllRecordsDone()){
        prepareDateToTrain();
    }
   
    
}

async function recordCustomAudio(fileName, audioLength){
    
    let stream = await getAudioStream();
    let audioContext = new AudioContext({
        latencyHint: "playback",
        sampleRate: MODEL_SAMPLE_RATE
    });
    let timeDataQueue = [];

    const streamSource = audioContext.createMediaStreamSource(stream);
    await audioContext.audioWorklet.addModule("recorder.worklet.js");
    const recorder = new AudioWorkletNode(audioContext, "recorder.worklet");
    streamSource.connect(recorder).connect(audioContext.destination);


    recorder.port.onmessage =  async(e) => {
        const inputBuffer = Array.from(e.data);
        
        if (inputBuffer[0] === 0) return;

        timeDataQueue.push(...inputBuffer);

        const num_samples = timeDataQueue.length;
        
        if (num_samples >= MODEL_SAMPLE_RATE * audioLength) {
            const audioData = new Float32Array(timeDataQueue.splice(0, MODEL_SAMPLE_RATE * audioLength));
            const wavBytes = getWavBytes(audioData.buffer);
            const blob = new Blob([wavBytes], { 'type': 'audio/wav' });
            const audioURL = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = audioURL;
            a.download = fileName;
            a.click();
            if (!Boolean(audioContext) || !Boolean(stream)) return; 
            audioContext.close();
            audioContext = null;
        
            timeDataQueue.splice(0);
            if (stream != null && stream.getTracks().length > 0) {
                stream.getTracks()[0].stop();
                
            }
            return 
        }
        
    }
}

function recogniceGesture(hand, handedness){
    const threshold = 0.03;
    var detectedGesture = null;
    const handPosition = computeHandOrientation(hand, handedness);
    const distance_index = compute_distance(hand[thumbTip], hand[indexTip]);
    const distance_middle = compute_distance(hand[thumbTip], hand[middleTip]);
    const distance_ring = compute_distance(hand[thumbTip], hand[ringTip]);
    const distance_pinky = compute_distance(hand[thumbTip], hand[pinkyTip]);


    if (handPosition == posibleHandPositions[0]){
        if(distance_index < threshold){
            detectedGesture = posibleGestures[0];
        }else if (distance_middle < 0.055){ // las distancia del middle es distinta por prueba y error
            detectedGesture = posibleGestures[1];
        }else if (distance_ring < threshold){
            detectedGesture = posibleGestures[2];
        }else if (distance_pinky < threshold){
            detectedGesture = posibleGestures[3];
        }
    }

    if (detectedGesture == null){
        lastGestureDetected = null;
        timesDetectedLastGesture = -1;
    }else if (detectedGesture != lastGestureDetected){
        lastGestureDetected = detectedGesture; 
        timesDetectedLastGesture = 0;

    }else if (detectedGesture == lastGestureDetected){
        timesDetectedLastGesture += 1;
    }

    return detectedGesture;
    
   
    
}



function computeHandOrientation(hand, handedness){
    const firstDistance = compute_distance(hand[indexMcp], hand[middleMcp], false);
    const secondDistance = compute_distance(hand[middleMcp], hand[ringMcp], false);
    const thridDistance = compute_distance(hand[ringMcp],hand[pinkyMcp], false);
    if(handedness == 'Left'){
        if (firstDistance > 0 && secondDistance > 0 && thridDistance > 0){
            return posibleHandPositions[1];
        }else {
            return posibleHandPositions[0];
        }
    }else if (handedness == 'Right'){
        if (firstDistance < 0 && secondDistance < 0 && thridDistance < 0){
            return posibleHandPositions[1];
        }else {
            return posibleHandPositions[0];
        }
    }
        
}


function compute_distance(point_a, point_b, euclidean = true){
    var a = point_b['x'] - point_a['x'];
    var b = point_b['y'] - point_a['y'];
    var c = point_b['z'] - point_a['z'];

    if (euclidean){
        return Math.sqrt(a * a + b * b + c * c);
    } else {
        return a
    }
}


function increaseClassCounter(classNumberString){
    var classNode = document.getElementById("rec"+classNumberString+"ClassNum");
    var classCount = parseInt(classNode.textContent);
    classNode.textContent = classCount + 1 +'/'+minimumRecords;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkAllRecordsDone(){
    
    if (parseInt(document.getElementById("recFirstClassNum").textContent) >= minimumRecords &&
        parseInt(document.getElementById("recSecondClassNum").textContent) >= minimumRecords && 
        parseInt(document.getElementById("recThirdClassNum").textContent) >= minimumRecords &&
        parseInt(document.getElementById("recNoiseClassNum").textContent) >= minimumRecords
     ){
        return true;
     } return false;
}

function recordAudio(millis) {
    var fileName = 'noise_' + Date.now() + ".wav";
    const audioData = new Float32Array(Array.from(
        {
            length: MODEL_SAMPLE_RATE * millis / 1e3
        }, () => Math.random() * 2 - 1));

    const wavBytes = getWavBytes(audioData.buffer);

    const blob = new Blob([wavBytes], { 'type': 'audio/wav' });
    const audioURL = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = audioURL;
    a.download = fileName;
    a.click();
    return fileName;
}

async function loadYamnetModel() {
    const model = await tf.loadGraphModel(MODEL_URL, { fromTFHub: true });
    return model;
}

async function testCustomAudioClassificationModel(yamnet, model, testDataArray,classes) {
    const RANDOM = Math.floor((Math.random() * testDataArray.length));
    const testSample = testDataArray[RANDOM];

    const audioData = await getTimeDomainDataFromFile(`data/audio/${testSample.fileName}`);
    playAudio(`data/audio/${testSample.fileName}`);
    const prediction = await predict(yamnet, model, audioData,'test');
    if(prediction >= 0){
        animateClass(classes[prediction]);
    }
}

async function predict(yamnet, model, audioData, mode) {
    const embeddings = await getEmbeddingsFromTimeDomainData(yamnet, audioData);
    const results = model.predict(embeddings);
    const meanTensor = results.mean((axis = 0));
    var toReturn = null;
    var customThreshold = classificationAudioThreshold;
    if(mode == 'real'){
        customThreshold = realClassificationAudioThreshold;
    }
    if (meanTensor.max().dataSync()[0] < customThreshold){
        toReturn = -1;
    }else{
        const argMaxTensor = meanTensor.argMax(0);
        toReturn = argMaxTensor.dataSync()[0];
    }
    embeddings.dispose();
    results.dispose();
    meanTensor.dispose();
    return toReturn
    
    
}

async function loadCustomAudioClassificationModelFromFile(url) {
    const model = await tf.loadLayersModel(url);
    model.summary();
    return model;
}

function logProgress(epoch, logs) {
    console.log(`Data for epoch ${epoch}, ${Math.sqrt(logs.loss)}`);
}

async function createAndTrainCustomAudioClassificationModel(yamnet, trainDataArray) {

    const INPUT_DATA = [];
    const OUTPUT_DATA = [];

    const context = new AudioContext({ latencyHint: "playback", sampleRate: MODEL_SAMPLE_RATE });
    for (let i = 0; i < trainDataArray.length; i++) {
        const audioData = await getTimeDomainDataFromFile(`data/audio/${trainDataArray[i].fileName}`, context);
        const embeddings = await getEmbeddingsFromTimeDomainData(yamnet, audioData);
        const embeddingsArray = embeddings.arraySync();
        console.log(embeddingsArray.length);
        for (let j = 0; j < embeddingsArray.length; j++) {
            INPUT_DATA.push(embeddingsArray[j]);
            OUTPUT_DATA.push(trainDataArray[i].classNumber);
        }

    }

    tf.util.shuffleCombo(INPUT_DATA, OUTPUT_DATA);

    const inputTensor = tf.tensor2d(INPUT_DATA);
     inputTensor.print(true);

    const outputAsOneHotTensor = tf.oneHot(tf.tensor1d(OUTPUT_DATA, 'int32'), NUM_CLASSES);
    // outputAsOneHotTensor.print(true);

    const model = createModel();
    await trainModel(model, inputTensor, outputAsOneHotTensor);
    await saveModel(model);
    return model;
}

async function saveModel(model) {
    model.save('downloads://model');
}

function createModel() {
    const model = tf.sequential();

    model.add(tf.layers.dense({ dtype: 'float32', inputShape: [INPUT_SHAPE], units: 512, activation: 'relu' }));
    model.add(tf.layers.dense({ units: NUM_CLASSES, activation: 'softmax' }));
    model.summary();
    return model;
}

async function trainModel(model, inputTensor, outputTensor) {
    model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    const params = {
        shuffle: true,
        validationSplit: 0.15,
        batchSize: 16,
        epochs: 20,
        callbacks: [new tf.CustomCallback({ onEpochEnd: logProgress }),
        //tf.callbacks.earlyStopping({ monitor: 'loss', patience: 3 })
        ]
    };

    const results = await model.fit(inputTensor, outputTensor, params);
    console.log("Average error loss: " + Math.sqrt(results.history.loss[results.history.loss.length - 1]));
    console.log("Average validation error loss: " +
        Math.sqrt(results.history.val_loss[results.history.val_loss.length - 1]));
}

async function getAudioStream(audioTrackConstraints) {
    let options = audioTrackConstraints || {};
    try {
        return await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
                sampleRate: options.sampleRate || MODEL_SAMPLE_RATE,
                sampleSize: options.sampleSize || 16,
                channelCount: options.channelCount || 1
            }
        });
    } catch (e) {
        console.error(e);
        return null;
    }
}

async function playAudio(url) {
    audioPlayer.src = url;
    audioPlayer.load();
    audioPlayer.onloadeddata = function () { audioPlayer.play(); };
}

async function getTimeDomainDataFromFile(url) {
    const audioContext = new AudioContext({
        sampleRate: MODEL_SAMPLE_RATE
    });
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0);
}

async function getEmbeddingsFromTimeDomainData(model, audioData) {
    const waveformTensor = tf.tensor(audioData);
    // waveformTensor.print(true);
    const [scores, embeddings, spectrogram] = model.predict(waveformTensor);
    waveformTensor.dispose();
    return embeddings;
}

function enableButton(buttonElement, enabled,  changeColor = false) {
    if (enabled) {
        buttonElement.removeAttribute("disabled");
        if(changeColor){
            buttonElement.style.backgroundColor = changeColor;
            
        }
        
    } else {
        buttonElement.setAttribute("disabled", "");
        buttonElement.style.backgroundColor = '#EFEFEF';
    }
}

function enableAllButtons(enable) {
    document.querySelectorAll("button").forEach(btn => {
        if (enable) {
            btn.removeAttribute("disabled");
        } else {
            btn.setAttribute("disabled", "");
        }
    });
}

app();

// Retorna Uint8Array de bytes WAV
function getWavBytes(buffer) {
    const numFrames = buffer.byteLength / Float32Array.BYTES_PER_ELEMENT;
    const headerBytes = getWavHeader(numFrames);
    const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);

    // prepend header, then add pcmBytes
    wavBytes.set(headerBytes, 0);
    wavBytes.set(new Uint8Array(buffer), headerBytes.length);

    return wavBytes;
}

function getWavHeader(numFrames) {
    const numChannels = 1;
    const bytesPerSample = 4;

    const format = 3; //Float32

    const blockAlign = numChannels * bytesPerSample;
    const byteRate = MODEL_SAMPLE_RATE * blockAlign;
    const dataSize = numFrames * blockAlign;

    const buffer = new ArrayBuffer(44);
    const dv = new DataView(buffer);

    let p = 0;

    function writeString(s) {
        for (let i = 0; i < s.length; i++) {
            dv.setUint8(p + i, s.charCodeAt(i));
        }
        p += s.length;
    }

    function writeUint32(d) {
        dv.setUint32(p, d, true);
        p += 4;
    }

    function writeUint16(d) {
        dv.setUint16(p, d, true);
        p += 2;
    }

    writeString('RIFF');              // ChunkID
    writeUint32(dataSize + 36);       // ChunkSize
    writeString('WAVE');              // Format
    writeString('fmt ');              // Subchunk1ID
    writeUint32(16);                  // Subchunk1Size
    writeUint16(format);              // AudioFormat
    writeUint16(numChannels);         // NumChannels
    writeUint32(MODEL_SAMPLE_RATE);   // SampleRate
    writeUint32(byteRate);            // ByteRate
    writeUint16(blockAlign);          // BlockAlign
    writeUint16(bytesPerSample * 8);  // BitsPerSample
    writeString('data');              // Subchunk2ID
    writeUint32(dataSize);            // Subchunk2Size

    return new Uint8Array(buffer);
}


