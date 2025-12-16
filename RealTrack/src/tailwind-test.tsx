import React from 'react';

const TailwindTest: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        Tailwind CSS Test
      </h1>
      <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
        <p className="font-bold">Success!</p>
        <p>Tailwind CSS está funcionando corretamente no seu projeto.</p>
      </div>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Botão com Tailwind
      </button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="text-red-800 font-semibold">Card 1</h3>
          <p className="text-red-600">Conteúdo do card</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="text-yellow-800 font-semibold">Card 2</h3>
          <p className="text-yellow-600">Conteúdo do card</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="text-purple-800 font-semibold">Card 3</h3>
          <p className="text-purple-600">Conteúdo do card</p>
        </div>
      </div>
    </div>
  );
};

export default TailwindTest;
