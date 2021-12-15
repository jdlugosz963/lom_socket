const express = require("express");
const app = express();
const socket = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const port = 8001;

app.use(express());
app.use(cors());

var server = app.listen(
  port,
  console.log(`Server is running on port: ${port} `)
);

const io = socket(server);

io.use((socket, next) => {
  let token = socket.handshake.auth.token;

  let config = {
    headers: {
      Authorization: `Token ${token}`,
    }
  }

  axios.get(
    'http://127.0.0.1:8000/api/auth/info/',
    config
  )
  .then((res) => {
    if(res.status === 200) {
      socket.userInfo = res.data.user;
      socket._config = config;
      socket.roomID = null;
      next();
    }
  })
  .catch(error => { });

  return next(new Error("Invalid token"))
});


io.on("connection", (socket) => {
  console.log(`${socket.userInfo.username}, connected!`);

  socket.on('send_group_message', ({message, group}) => {
    axios.post(
      `http://127.0.0.1:8000/api/chat/groups/detail/${group.id}/messages/`,
      {message: message},
      socket._config
    ).then(res => {
      res_message = res.data

      user_message = {...res_message}
      other_message = {...res_message}

      user_message["is_mine"] = true
      other_message["is_mine"] = false

      socket.emit("receive_group_message", {message: user_message});
      socket.broadcast.to(group.id).emit("receive_group_message", {message: other_message});
    }).catch(err => {  })
  });

  socket.on('join_group', ({group_id}) => {
    axios.get(
      `http://127.0.0.1:8000/api/chat/groups/detail/${group_id}/`,
      socket._config
    )
    .then((res) => {
      if(res.status === 200)
        socket.join(group_id);
    }).catch(error => { });
  })


  socket.on("disconnect", () => {
    console.log(`${socket.userInfo.username} disconnected!`);
  });
});
