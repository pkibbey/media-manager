const cocossd = require('@tensorflow-models/coco-ssd');

// Singleton object to hold the loaded model
const cocoSsdModel = { value: null };

(async () => {
  cocoSsdModel.value = await cocossd.load({
    base: 'lite_mobilenet_v2',
  });
})();

module.exports = cocoSsdModel;
