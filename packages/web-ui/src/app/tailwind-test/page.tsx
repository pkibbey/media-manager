export default function TailwindTest() {
  return (
    <div className="p-8 bg-blue-500 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Tailwind Test</h1>
      <p className="text-sm opacity-80">
        If you can see this styled (blue background, white text, rounded corners, shadow), 
        then Tailwind CSS is working correctly.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-red-500 p-4 rounded">Red</div>
        <div className="bg-green-500 p-4 rounded">Green</div>
        <div className="bg-yellow-500 p-4 rounded">Yellow</div>
      </div>
    </div>
  );
}
