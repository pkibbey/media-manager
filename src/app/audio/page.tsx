'use client';

// Import TensorFlow.js directly
import * as tf from '@tensorflow/tfjs';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Declare TensorFlow as a third-party library
declare global {
  interface Window {
    tf: any;
  }
}

export default function AudioPage() {
  const [text, setText] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [pitch, setPitch] = useState<number>(1);
  const [rate, setRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('system-voices');
  const [modelPath, setModelPath] = useState<string>('');
  const [customModels, setCustomModels] = useState<
    { name: string; path: string }[]
  >([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const synth = useRef<SpeechSynthesis | null>(null);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    // Make TensorFlow.js available in the window object
    const loadTensorFlow = async () => {
      try {
        if (!window.tf) {
          // Use the imported tf instead of loading from CDN
          window.tf = tf;
          console.log('TensorFlow.js loaded successfully');
        }
      } catch (error) {
        console.error('Failed to load TensorFlow.js:', error);
        setError('Failed to load TensorFlow.js library');
      }
    };

    loadTensorFlow();

    // Check for stored custom models
    const storedModels = localStorage.getItem('customVoiceModels');
    if (storedModels) {
      try {
        setCustomModels(JSON.parse(storedModels));
      } catch (e) {
        console.error('Error parsing stored models:', e);
      }
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synth.current = window.speechSynthesis;

      // Load available voices
      const loadVoices = () => {
        const availableVoices = synth.current?.getVoices() || [];
        setVoices(
          availableVoices.filter((voice) => voice.lang.startsWith('en-US')),
        );

        // Set a default voice if available
        if (availableVoices.length > 0 && !selectedVoice) {
          setSelectedVoice(availableVoices[0].name);
        }
      };

      // Chrome and Safari handle voice loading differently
      loadVoices();

      // The voiceschanged event is fired when the list of voices is populated
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        if (synth.current?.speaking) {
          synth.current.cancel();
        }
      };
    }

    // Show error if speech synthesis is not supported
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError('Speech synthesis is not supported in your browser.');
    }
  }, [selectedVoice]);

  const handleSpeak = () => {
    if (activeTab === 'system-voices') {
      speakWithSystemVoice();
    } else {
      speakWithCustomModel();
    }
  };

  const speakWithSystemVoice = () => {
    if (!synth.current) return;

    if (synth.current.speaking) {
      synth.current.cancel();
      setIsPlaying(false);
      return;
    }

    if (text.trim() === '') {
      setError('Please enter some text to convert to speech.');
      return;
    }

    setError(null);

    try {
      const utterance = new SpeechSynthesisUtterance(text);

      // Set the selected voice
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) utterance.voice = voice;

      // Set customization options
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = volume;

      // Event handlers
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => {
        setIsPlaying(false);
        setError('An error occurred while playing the speech.');
      };

      synth.current.speak(utterance);
    } catch (err) {
      setError('Failed to generate speech. Please try again.');
      console.error('Speech synthesis error:', err);
    }
  };

  const loadModel = async () => {
    if (!window.tf) {
      setError('TensorFlow.js is not loaded. Please refresh and try again.');
      return;
    }

    if (!selectedModel && !modelPath) {
      setError('Please select or enter a model path.');
      return;
    }

    try {
      setModelLoading(true);
      setError(null);

      const path = selectedModel || modelPath;
      console.log(`Loading model from: ${path}`);

      // Validate URL format for remote models
      if (path.startsWith('http') && !path.endsWith('model.json')) {
        if (!path.endsWith('.json')) {
          // Show warning if URL doesn't end with .json
          console.warn('Model URL should usually end with model.json');
        }
      }

      // Attempt to load the model with proper error handling
      try {
        // First try loading as a graph model (SavedModel format)
        modelRef.current = await window.tf.loadGraphModel(path);
        console.log('Graph model loaded successfully');
      } catch (graphError) {
        console.error(
          'Failed to load as graph model, trying layered model:',
          graphError,
        );

        try {
          // If graph model fails, try loading as a layered model (Keras format)
          modelRef.current = await window.tf.loadLayersModel(path);
          console.log('Layered model loaded successfully');
        } catch (layeredError) {
          throw new Error(`Failed to load model: ${layeredError || 'Unknown error'}. 
            If you received a 404 error, please verify the URL is correct and the model.json file exists at that location.
            For CORS issues, ensure the server hosting the model allows cross-origin requests.`);
        }
      }

      setIsModelLoaded(true);
      setError(null);

      // Save this model to localStorage if it's not already there
      if (modelPath && !customModels.some((m) => m.path === modelPath)) {
        const modelName =
          modelPath.split('/').pop() ||
          `Custom Model ${customModels.length + 1}`;
        const newModel = { name: modelName, path: modelPath };
        const updatedModels = [...customModels, newModel];
        setCustomModels(updatedModels);
        localStorage.setItem(
          'customVoiceModels',
          JSON.stringify(updatedModels),
        );
        setSelectedModel(modelPath);
      }
    } catch (err) {
      console.error('Error loading model:', err);
      setError(
        `Failed to load the model: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setModelLoading(false);
    }
  };

  const speakWithCustomModel = async () => {
    if (!modelRef.current) {
      setError('No model is loaded. Please load a model first.');
      return;
    }

    if (text.trim() === '') {
      setError('Please enter some text to convert to speech.');
      return;
    }

    setIsPlaying(true);
    setError(null);

    try {
      // This is a placeholder for the actual model inference
      // The exact implementation will depend on the specific model type and architecture
      console.log('Processing text with custom model:', text);

      // Simulating processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For a real implementation, you would:
      // 1. Preprocess the text (tokenize, encode, etc.)
      // 2. Run inference with the model
      // 3. Post-process the output to generate audio
      // 4. Play the audio

      alert(
        'Custom model inference would happen here with the actual model. This is currently a placeholder.',
      );

      // Example of how you might use TensorFlow.js for inference
      // const encodedText = encodeText(text); // You'd need to implement this based on your model
      // const input = tf.tensor(encodedText);
      // const output = await modelRef.current.predict(input);
      // const audioBuffer = decodeAudioFromOutput(output); // You'd need to implement this
      // playAudio(audioBuffer);
    } catch (err) {
      console.error('Error using custom model:', err);
      setError(
        `Custom model error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    setError(
      'Download functionality requires a server-side text-to-speech service integration.',
    );
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setModelLoading(true);
    setError(null);

    try {
      // Check for model.json (TensorFlow.js format)
      const modelJsonFile = Array.from(files).find(
        (file) =>
          file.name.endsWith('model.json') || file.name.endsWith('.json'),
      );

      // Handle TensorFlow.js model files
      if (modelJsonFile) {
        const modelName = modelJsonFile.name;
        console.log(`Processing TensorFlow.js model file: ${modelName}`);

        // Create a URL for the model.json file
        const modelUrl = URL.createObjectURL(modelJsonFile);
        setModelPath(modelUrl);

        // Try to load the model
        try {
          // First attempt to load as a graph model
          modelRef.current = await window.tf.loadGraphModel(modelUrl);
          console.log('Graph model loaded successfully from uploaded file');
        } catch (graphError) {
          console.error(
            'Failed to load as graph model, trying layered model:',
            graphError,
          );

          try {
            // If that fails, try loading as a layers model
            modelRef.current = await window.tf.loadLayersModel(modelUrl);
            console.log('Layered model loaded successfully from uploaded file');
          } catch (_layeredError) {
            throw new Error(
              'Failed to load model from the uploaded file. The model may not be in the correct TensorFlow.js format.',
            );
          }
        }

        // If we get here, the model was loaded successfully
        setIsModelLoaded(true);

        // Save model reference to localStorage
        const newModel = { name: modelName, path: modelUrl };
        const updatedModels = [...customModels, newModel];
        setCustomModels(updatedModels);
        localStorage.setItem(
          'customVoiceModels',
          JSON.stringify(updatedModels),
        );
        setSelectedModel(modelUrl);
      } else {
        setError(
          'No valid model file found. Please select a TensorFlow.js model.json file.',
        );
      }
    } catch (err) {
      console.error('Error processing uploaded file:', err);
      setError(
        `Failed to load the model: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setModelLoading(false);
      // Reset input field to allow selecting the same file again
      e.target.value = '';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Text to Speech Converter</h1>

      {error && (
        <Alert
          variant={error.includes('placeholder') ? 'default' : 'destructive'}
          className="mb-4"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Convert Text to Speech</CardTitle>
          <CardDescription>
            Enter your text below and customize the voice settings to generate
            spoken audio.
          </CardDescription>
        </CardHeader>

        <Tabs
          defaultValue="system-voices"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mx-6 mb-2">
            <TabsTrigger value="system-voices">System Voices</TabsTrigger>
            <TabsTrigger value="custom-model">Custom Voice Model</TabsTrigger>
          </TabsList>

          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="text-input">Text to Convert</Label>
              <Textarea
                id="text-input"
                placeholder="Enter the text you want to convert to speech..."
                className="min-h-[150px] mt-1"
                value={text}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setText(e.target.value)
                }
              />
            </div>

            <TabsContent value="system-voices" className="space-y-4 mt-0 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voice-select">Voice</Label>
                  <Select
                    value={selectedVoice}
                    onValueChange={setSelectedVoice}
                    disabled={voices.length === 0}
                  >
                    <SelectTrigger id="voice-select">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Pitch: {pitch.toFixed(1)}</Label>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[pitch]}
                    onValueChange={(values) => setPitch(values[0])}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Rate: {rate.toFixed(1)}</Label>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[rate]}
                    onValueChange={(values) => setRate(values[0])}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Volume: {volume.toFixed(1)}</Label>
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[volume]}
                    onValueChange={(values) => setVolume(values[0])}
                    className="mt-2"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom-model" className="space-y-4 mt-0 pt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customModels.length > 0 && (
                    <div>
                      <Label htmlFor="model-select">Select Saved Model</Label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger id="model-select">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {customModels.map((model) => (
                            <SelectItem key={model.path} value={model.path}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="model-path">Model URL/Path</Label>
                    <Input
                      id="model-path"
                      placeholder="https://example.com/path/to/model.json"
                      value={modelPath}
                      onChange={(e) => setModelPath(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter a URL that directly points to a TensorFlow.js
                      model.json file. Make sure the URL is accessible and the
                      server allows CORS.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={loadModel}
                    disabled={modelLoading}
                    variant="outline"
                  >
                    {modelLoading ? 'Loading...' : 'Load Model'}
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      id="model-upload"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".json,.bin,.weights"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={modelLoading}
                    >
                      {modelLoading ? 'Uploading...' : 'Upload Model Files'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      Select model files (TensorFlow.js)
                    </p>
                  </div>
                </div>

                {isModelLoaded && (
                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-green-700 text-sm">
                      Model loaded successfully! You can now convert text to
                      speech using this model.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>

        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleSpeak}
            className="w-full sm:w-auto"
            disabled={
              (activeTab === 'system-voices' && text.trim() === '') ||
              (activeTab === 'custom-model' &&
                (!isModelLoaded || text.trim() === ''))
            }
          >
            {isPlaying ? 'Stop Speaking' : 'Speak Now'}
          </Button>

          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full sm:w-auto"
            disabled={
              (activeTab === 'system-voices' && text.trim() === '') ||
              (activeTab === 'custom-model' &&
                (!isModelLoaded || text.trim() === ''))
            }
          >
            Download Audio (MP3)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
