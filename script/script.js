// Substitua pelos URLs reais da API e do WebSocket
const LOGIN_API = "https://resources-main-7.onrender.com/login";
const RESOURCES_API = "https://resources-main-7.onrender.com/recursos";
const WEBSOCKET_URL = "wss://resources-main-7.onrender.com"; // Substitua pela URL real do seu servidor WebSocket

let jwtToken = null;
let userName = null;
let userId = null;
let websocket;

function handleLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Realiza a requisição de login
  const loginData = {
    nome: username,
    password,
  };

  fetch(LOGIN_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("Falha no login: " + data.error);
        return;
      }
      jwtToken = data.token;
      userName = data.userName; // Armazena o nome do usuário
      userId = data.userId; // Armazena o ID do usuário
      console.log("Login bem-sucedido! Token:", jwtToken);

      // Exibe o nome do usuário
      document.getElementById("user-name").textContent = `Bem-vindo, ${userName}!`;

      // Esconde o formulário de login e mostra a lista de recursos
      document.getElementById("login-form").style.display = "none";
      document.getElementById("resource-list").style.display = "block";
      fetchResources();
      fetchReservedResources(); // Busca os recursos reservados após o login bem-sucedido
    })
    .catch((error) => {
      console.error("Erro durante o login:", error);
      alert("Falha no login!");
    });

  return false; // Impede a submissão padrão do formulário
}

function fetchResources() {
  fetch(RESOURCES_API, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const recursos = data.recursos;
      const resourceDropdown = document.getElementById("resources-dropdown");
      resourceDropdown.innerHTML = "";

      if (!recursos || !Array.isArray(recursos)) {
        console.error("Formato de recursos inválido:", recursos);
        alert("Falha no retorno de Recursos: Formato de recursos inválido");
        return;
      }

      const reservedResource = recursos.find((resource) => resource.reservaId === userId);
      if (reservedResource) {
        alert("Você já possui um recurso reservado. Por favor, devolva antes de reservar outro.");
        document.getElementById("reserve-button").disabled = true;
      } else {
        document.getElementById("reserve-button").disabled = false;
        recursos
          .filter((resource) => resource.disponivel)
          .forEach((resource) => {
            const option = document.createElement("option");
            option.value = resource.id;
            option.textContent = resource.nome;
            resourceDropdown.appendChild(option);
          });
      }
    })
    .catch((error) => {
      console.error("Erro ao buscar recursos:", error);
      alert("Falha ao buscar recursos!");
    });
}

function fetchReservedResources() {
  fetch(RESOURCES_API, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const reservedResourcesDropdown = document.getElementById("reserved-resources-dropdown");
      reservedResourcesDropdown.innerHTML = "";

      if (!data || !data.recursos || !Array.isArray(data.recursos)) {
        console.error("Formato de recursos inválido:", data);
        alert("Falha no retorno de recursos reservados: Formato de recursos inválido");
        return;
      }

      const reservedResources = data.recursos.filter((resource) => resource.reservaId === userId);
      if (reservedResources.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Nenhum recurso reservado";
        reservedResourcesDropdown.appendChild(option);
        document.getElementById("return-button").disabled = true;
      } else {
        document.getElementById("return-button").disabled = false;
        reservedResources.forEach((resource) => {
          const option = document.createElement("option");
          option.value = resource.id;
          option.textContent = resource.nome;
          reservedResourcesDropdown.appendChild(option);
        });
      }
    })
    .catch((error) => {
      console.error("Erro ao buscar recursos reservados:", error);
      alert("Falha ao buscar recursos reservados!");
    });
}

function returnResource() {
  const reservedResourcesDropdown = document.getElementById("reserved-resources-dropdown");
  const resourceId = reservedResourcesDropdown.value;

  if (!resourceId) {
    alert("Por favor, selecione um recurso reservado para devolver!");
    return;
  }

  fetch(`${RESOURCES_API}/${resourceId}/devolver`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("Falha ao devolver o recurso: " + data.error);
      } else {
        alert("Recurso devolvido com sucesso!");
        fetchReservedResources();
        fetchResources();
        websocket.send(JSON.stringify({ action: "return" }));
      }
    })
    .catch((error) => {
      console.error("Erro ao devolver o recurso:", error);
      alert("Falha ao devolver o recurso!");
    });
}

function reserveResource() {
  const resourceDropdown = document.getElementById("resources-dropdown");
  const resourceId = resourceDropdown.value;

  if (!resourceId) {
    alert("Por favor, selecione um recurso para reservar!");
    return;
  }

  fetch(`${RESOURCES_API}/${resourceId}/reservar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        alert("Falha ao reservar o recurso: " + data.error);
      } else {
        alert("Recurso reservado com sucesso!");
        fetchResources();
        fetchReservedResources();
        websocket.send(JSON.stringify({ action: "reserve" }));
      }
    })
    .catch((error) => {
      console.error("Erro ao reservar o recurso:", error);
      alert("Falha ao reservar o recurso!");
    });
}

function connectWebSocket() {
  websocket = new WebSocket(WEBSOCKET_URL);

  websocket.onopen = function() {
    console.log("Conexão WebSocket estabelecida.");
  };

  websocket.onmessage = function(event) {
    const message =
    JSON.parse(event.data);
    console.log("Mensagem WebSocket recebida:", message);
    if (message.action === "reserve" || message.action === "return") {
      fetchResources();
      fetchReservedResources();
    }
  };

  websocket.onclose = function() {
    console.log("Conexão WebSocket fechada. Reconectando...");
    setTimeout(connectWebSocket, 3000);
  };

  websocket.onerror = function(error) {
    console.error("Erro WebSocket:", error);
  };
}

// Anexa a função handleLogin à submissão do formulário de login
document.getElementById("login-form").onsubmit = handleLogin;

// Anexa as funções de reserva e devolução aos respectivos botões
document.getElementById("reserve-button").onclick = reserveResource;
document.getElementById("return-button").onclick = returnResource;

// Inicia a conexão WebSocket ao carregar a página
connectWebSocket();
