import cocossd from '@tensorflow-models/coco-ssd';

// Singleton object to hold the loaded model
const cocoSsdModel = { value: null };

(async () => {
  cocoSsdModel.value = await cocossd.load({ base: 'mobilenet_v2' });
  console.log('COCO-SSD model loaded');
})();

export default cocoSsdModel;
