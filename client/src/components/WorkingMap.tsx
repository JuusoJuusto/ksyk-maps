export default function WorkingMap() {
  return (
    <div className="w-full h-screen bg-blue-100 p-4">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">KSYK Campus Navigator</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600">
            <div className="font-bold">M12</div>
            <div className="text-sm">Music Building</div>
          </button>
          
          <button className="bg-red-500 text-white p-4 rounded-lg hover:bg-red-600">
            <div className="font-bold">K15</div>
            <div className="text-sm">Central Hall</div>
          </button>
          
          <button className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600">
            <div className="font-bold">L01</div>
            <div className="text-sm">Gymnasium</div>
          </button>
          
          <button className="bg-orange-500 text-white p-4 rounded-lg hover:bg-orange-600">
            <div className="font-bold">R10</div>
            <div className="text-sm">R Building</div>
          </button>
          
          <button className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600">
            <div className="font-bold">A20</div>
            <div className="text-sm">A Building</div>
          </button>
          
          <button className="bg-indigo-500 text-white p-4 rounded-lg hover:bg-indigo-600">
            <div className="font-bold">U30</div>
            <div className="text-sm">U Building</div>
          </button>
        </div>
        
        <div className="mt-6 text-gray-600">
          <p>Click any room button to select it</p>
          <p>Campus buildings: M, K, L, R, A, U</p>
        </div>
      </div>
    </div>
  );
}