import { Server } from "socket.io";

let io;
const onlineUsers = new Map(); // userId -> socketId

export const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 New client connected:", socket.id);

    // 🔹 Register user when they log in or open chat
    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log("✅ Registered user:", userId);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // 🔹 Handle sending message
    socket.on("sendMessage", async (datas) => {
      const { senderId, receiverId, data } = datas;
      const receiverSocket = onlineUsers.get(receiverId);

      console.log("📩 Message:", senderId, "->", receiverId, data.content);

      // Emit to receiver (real-time)
      if (receiverSocket) {
        io.to(receiverSocket).emit("receiveMessage", {
          senderId,
          data,
          createdAt: new Date(),
        });
      }

      // for real time delte
      socket.on("deleteMessage", ({ messageId, receiverId }) => {
        const receiverSocket = onlineUsers.get(receiverId);

        if (receiverSocket) {
          io.to(receiverSocket).emit("messageDeleted", { messageId });
        }

        // optionally confirm deletion to sender
        socket.emit("messageDeleted", { messageId });
      });


          // for real time  reaction
   socket.on("reactMessage", ({ messageId, reaction, receiverId, senderId }) => {
  const receiverSocket = onlineUsers.get(receiverId);

  // Send reaction event to the receiver (real-time)
  if (receiverSocket) {
    io.to(receiverSocket).emit("messageReacted", {
      messageId,
      reaction,
      senderId,
      updatedAt: new Date(),
    });
  }

  // Acknowledge back to the sender that reaction is done
  socket.emit("reactionAcknowledged", {
    messageId,
    reaction,
  });

  console.log(`💬 Reaction from ${senderId} to ${receiverId}: ${reaction}`);
});



      // Also confirm to sender (for double-tick later)
      socket.emit("messageSent", {
        receiverId,
        data,
        createdAt: new Date(),
      });
    });

    // 🔹 Typing indicator
    socket.on("typing", ({ senderId, receiverId }) => {
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit("typing", { senderId });
      }
    });

    // 🔹 Stop typing
    socket.on("stopTyping", ({ senderId, receiverId }) => {
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit("stopTyping", { senderId });
      }
    });

    // 🔹 Disconnect
    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

// Optional: export io for other controllers
export const getIO = () => io;
