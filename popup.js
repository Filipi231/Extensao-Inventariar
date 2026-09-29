// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('toggle');
  const statusText = document.getElementById('statusText');
  const labelOn = document.getElementById('labelOn');
  const labelOff = document.getElementById('labelOff');

  // Função para atualizar cores dos labels
  function updateLabels(isChecked) {
    if (isChecked) {
      labelOn.classList.add('active');
      labelOff.classList.remove('active');
    } else {
      labelOff.classList.add('active');
      labelOn.classList.remove('active');
    }
  }

  // Verificar estado atual da página
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "getState"}, function(response) {
      if (response && response.painterOn !== undefined) {
        toggle.checked = response.painterOn === "1";
        updateLabels(toggle.checked);
        statusText.textContent = toggle.checked ? 'Pintura ativa' : 'Pintura inativa';
      } else {
        statusText.textContent = 'Não disponível';
      }
    });
  });

  // Quando o toggle muda
  toggle.addEventListener('change', function() {
    const isChecked = this.checked;
    updateLabels(isChecked);
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggle",
        value: isChecked
      }, function(response) {
        if (response && response.success) {
          statusText.textContent = isChecked ? 'Pintura ativa' : 'Pintura inativa';
        } else {
          statusText.textContent = 'Erro ao alterar';
          // Reverte o toggle se houve erro
          toggle.checked = !isChecked;
          updateLabels(!isChecked);
        }
      });
    });
  });
});