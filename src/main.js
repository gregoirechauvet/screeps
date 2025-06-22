const harvester = require("./role.harvester");
const upgrader = require("./role.upgrader");
const builder = require("./role.builder");
const claimer = require("./role.claimer");

module.exports.loop = () => {
  console.log("Game tick");

  spawn();

  for (let name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role === "harvester") {
      harvester.run(creep);
    }
    if (creep.memory.role === "upgrader") {
      upgrader.run(creep);
    }
    if (creep.memory.role === "builder") {
      builder.run(creep);
    }
    if (creep.memory.role === "claimer") {
      claimer.run(creep);
    }
  }

  if (Game.time % 100 === 0) {
    cleanup();
  }
};

function cleanup() {
  console.log("Cleaning up dead creep memory");
  for (let name in Memory.creeps) {
    if (Game.creeps[name] !== undefined) {
      continue;
    }

    delete Memory.creeps[name];
  }
}

function spawn() {
  const roleTargets = {
    W5N8: {
      harvester: 5,
      upgrader: 6,
      builder: 4,
    },
    // W6N8: {
    //   builder: 1,
    // },
  };

  const creepCountByRoomAndRoles = {};
  for (let name in Game.creeps) {
    const creep = Game.creeps[name];
    const room = creep.room.name;
    const role = creep.memory.role;

    if (creepCountByRoomAndRoles[room] === undefined) {
      creepCountByRoomAndRoles[room] = {};
    }

    if (creepCountByRoomAndRoles[room][role] === undefined) {
      creepCountByRoomAndRoles[room][role] = 0;
    }
    creepCountByRoomAndRoles[room][role]++;
  }

  console.log(JSON.stringify(creepCountByRoomAndRoles));

  for (let room in roleTargets) {
    const roomValues = {
      harvester: 0,
      upgrader: 0,
      builder: 0,
      ...(creepCountByRoomAndRoles[room] !== undefined ? creepCountByRoomAndRoles[room] : {}),
    };

    if (roomValues.harvester < roleTargets[room].harvester) {
      console.log("Attemping harvester spawn");
      const ok = harvester.spawn(Game.spawns.Spawn);
      if (ok) {
        console.log("Harvester spawning");
      }
      return;
    }

    if (roomValues.upgrader < roleTargets[room].upgrader) {
      console.log("Attemping upgrader spawn");
      const ok = upgrader.spawn(Game.spawns.Spawn);
      if (ok) {
        console.log("Upgrader spawning");
      }
      return;
    }

    if (roomValues.builder < roleTargets[room].builder) {
      console.log("Attemping builder spawn");
      const resp = builder.spawn(Game.spawns.Spawn, { action: "changeRoom", roomName: room });
      if (resp === OK) {
        console.log("Builder spawning");
      }
      return;
    }
  }

  const claimerCount = Object.values(creepCountByRoomAndRoles).reduce((acc, room) => acc + (room.claimer || 0), 0);

  // const roomsToClaim = ["W6N8"];
  // if (roomsToClaim.length > 0 && claimerCount === 0) {
  //   console.log("Attemping claimer spawn");
  //   const ok = claimer.spawn(Game.spawns.Spawn, { action: "changeRoom", roomName: roomsToClaim[0] });
  //   if (ok) {
  //     console.log("Builder spawning");
  //   }
  //   return;
  // }
}
