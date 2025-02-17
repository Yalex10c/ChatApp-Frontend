import { useState, useEffect } from "react";
import { io } from "socket.io-client";

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [username, setUsername] = useState("");
  const [serverURL, setServerURL] = useState("");
  const [serverIP, setServerIP] = useState("");
  const [serverPort, setServerPort] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState("ngrok");
  const [image, setimage] = useState(null);

  useEffect(() => {
    console.log("Image updated:", image);
  }, [image]);

  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);

  const emojiMap = {
    laugh: "😂",
    devil: "👿",
    starstruck: "🤩",
    heart:"❤️"
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setimage(reader.result);
        setErrorMessage("");
      };
      reader.readAsDataURL(file);
    }
  };

  const connectToServer = () => {
    let finalURL = "";

    if (connectionType === "ngrok") {
      if (!serverURL.trim() || !username.trim()) {
        setErrorMessage("Llena todos los campos (Server URL y Username).");
        return;
      }
      finalURL = serverURL;
    } else if (connectionType === "local") {
      if (!serverIP.trim() || !serverPort.trim() || !username.trim()) {
        setErrorMessage("Llena todos los campos (IP, Puerto y Username).");
        return;
      }
      finalURL = `http://${serverIP}:${serverPort}`;
    }

    if (!image) {
      setErrorMessage("Debes subir una foto antes de continuar.");
      return;
    }

    const data = {
      username: username,
      profilephoto: image,
    };

    try {
      const newSocket = io(finalURL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      setSocket(newSocket);
      setErrorMessage("");

      newSocket.on("connect", () => {
        console.log("Connected to server:", newSocket.id);
        setIsConnected(true);
        newSocket.emit("setprofile", data);
      });

      newSocket.on("messageHistory", (historial) => {
        console.log("Received message history:", historial);
        setMessages(historial);
      });

      newSocket.on("message", (data) => {
        console.log("New message from server:", data);
        setMessages((prevMessages) => [...prevMessages, data]);
      });

      newSocket.on("reaction", (updatedMessage) => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) =>
            msg._id === updatedMessage._id ? updatedMessage : msg
          );
        });
      });

      newSocket.on("disconnect", () => {
        console.log("Disconnected from server");
        setIsConnected(false);
      });
    } catch (error) {
      setErrorMessage("Failed to connect. Check the server details.");
      console.error("Connection error:", error);
    }
  };

  const disconnectFromServer = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      console.log("🔌 Disconnected manually");
    }
  };

  const sendMessage = () => {
    if (socket && (inputMessage.trim() || image)) {
      console.log("Mensaje a enviar:", inputMessage);
      console.log("Imagen a enviar:", image);

      setTimeout(() => {
        socket.emit("message", {
          message: inputMessage || "",
          image: image || "",
        });

        setInputMessage("");
        setimage(null);
      }, 100);
    }
  };

  const sendReaction = (messageId, reactionCode) => {
    if (socket) {
      console.log(messageId);
      console.log(reactionCode);
      socket.emit("reaction", { messageId, username, reactionCode });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Chat App</h1>

      {isConnected && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md w-96 h-56 overflow-y-auto mb-6">
          <h2 className="text-lg font-semibold mb-2">Messages:</h2>
          <ul className="space-y-2">
            {messages.length === 0 ? (
              <li className="text-gray-400 text-sm">No messages yet</li>
            ) : (
              messages.map((msg, index) => (
                <li
                  key={index}
                  className="p-2 bg-gray-700 rounded border border-gray-600"
                >
                  {msg.profilephoto && (
                    <img
                      src={msg.profilephoto}
                      alt="User"
                      className="w-10 h-10 rounded-full mr-2 border border-gray-500"
                    />
                  )}
                  <div>
                    {msg.message}
                    <div className="mt-2 flex space-x-2">
                      {Object.keys(emojiMap).map((key) => (
                        <button
                          key={key}
                          className="bg-gray-600 hover:bg-gray-700 p-1 rounded relative"
                          onClick={() => sendReaction(msg._id, key)}
                        >
                          {emojiMap[key]}
                          {Array.isArray(msg.reactions) &&
                            msg.reactions.filter(
                              (reaction) => reaction?.reactionCode === key
                            ).length > 0 && (
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
                                {
                                  msg.reactions.filter(
                                    (reaction) => reaction?.reactionCode === key
                                  ).length
                                }
                                  
                              </span>
                            )}
                        </button>
                      ))}
                    </div>
                    {msg.media && msg.media.trim().length > 0 && (
                      <img
                        src={msg.media}
                        alt="User upload"
                        className="mt-2 w-40 rounded"
                      />
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {!isConnected ? (
        <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col space-y-4 w-80">
          <h2 className="text-lg font-semibold">Choose Connection Type</h2>
          <select
            value={connectionType}
            onChange={(e) => setConnectionType(e.target.value)}
            className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ngrok">Ngrok URL</option>
            <option value="local">Local IP & Port</option>
          </select>

          {connectionType === "ngrok" ? (
            <>
              <input
                type="text"
                value={serverURL}
                onChange={(e) => setServerURL(e.target.value)}
                placeholder="Enter Ngrok URL (e.g., https://abc123.ngrok.io)"
                className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          ) : (
            <>
              <input
                type="text"
                value={serverIP}
                onChange={(e) => setServerIP(e.target.value)}
                placeholder="Enter Local IP (e.g., 192.168.1.100)"
                className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={serverPort}
                onChange={(e) => setServerPort(e.target.value)}
                placeholder="Enter Port (e.g., 3000)"
                className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="p-2 bg-gray-700 border border-gray-600 rounded w-full mb-4"
          />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Username"
            className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {image && (
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-400">Profile Photo Preview:</p>
              <img
                src={image}
                alt="Preview"
                className="mt-2 w-20 h-20 rounded-full border border-gray-600"
              />
            </div>
          )}
          <button
            onClick={connectToServer}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Connect to Server
          </button>
          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={disconnectFromServer}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
          >
            Disconnect
          </button>
          <div className="bg-gray-800 p-6 rounded-lg shadow-md w-96 relative">
            <div className="flex space-x-2 mt-10">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Write a message..."
                className="flex-grow p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Send
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setimage(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
