// Este bundle é carregado na janela de impressão da OS
window.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('os-root');
  if (!root || !window.ocorrencia) return;
  // Carrega React e ReactDOM dinamicamente
  const scriptReact = document.createElement('script');
  scriptReact.src = 'https://unpkg.com/react@18/umd/react.development.js';
  scriptReact.onload = () => {
    const scriptReactDOM = document.createElement('script');
    scriptReactDOM.src = 'https://unpkg.com/react-dom@18/umd/react-dom.development.js';
    scriptReactDOM.onload = () => {
      // Carrega o componente OSTemplateSocorro
      fetch('/os-template-socorro.js').then(r => r.text()).then(code => {
        eval(code); // define OSTemplateSocorro global
        ReactDOM.createRoot(root).render(
          React.createElement(window.OSTemplateSocorro, { ocorrencia: window.ocorrencia })
        );
      });
    };
    document.body.appendChild(scriptReactDOM);
  };
  document.body.appendChild(scriptReact);
});
