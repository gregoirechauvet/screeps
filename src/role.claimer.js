const utils = require("utils");

const actions = {
  default() {
    // Nothing
  },
  changeRoom(creep, state) {
    creep.moveTo(new RoomPosition(25, 25, state.roomName));

    if (creep.room.name === state.roomName) {
      return { action: "claim", roomName: state.roomName };
    }

    return state;
  },
  claim(creep, state) {
    const controller = creep.room.roomController;
    utils.doOrMove(creep, controller, (c) => c.claimController(controller));

    return state;
  },
};

module.exports = {
  spawn(spawnStructure) {
    const count = Memory.claimerCount != null ? Memory.claimerCount : 0;

    const [bodyParts, mark] = [[MOVE, MOVE, MOVE, CLAIM], 1];
    const resp = spawnStructure.spawnCreep(bodyParts, `Claimer ${count} - MK${mark}`, {
      memory: { role: "claimer", mark },
    });

    const ok = resp === OK;
    if (ok) {
      Memory.claimerCount = count + 1;
    }
    return ok;
  },

  /** @param {Creep} creep **/
  run(creep) {
    const state = creep.memory.state || { action: "changeRoom", roomName: "W6N8" };

    const actionFn = state != null ? actions[state.action] : actions.default;
    if (actionFn === undefined) {
      throw Error(`Unknown action ${state.action}`);
    }

    const updatedState = actionFn(creep, state);

    if (updatedState != null) {
      creep.memory.state = updatedState;
    }
  },
};
