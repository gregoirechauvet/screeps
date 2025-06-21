const utils = require("utils");

/**
 * @typedef {{ action: "harvest", sourceId: Id<Source> }} HarvestState
 * @typedef {{ action: "unload" }} UnloadState
 * @typedef { HarvestState | UnloadState} HarvesterState
 */

/**
 * @param {Creep} creep
 * @returns {HarvesterState}
 */
function newHarvestState(creep) {
  const source = creep.pos.findClosestByRange(FIND_SOURCES);
  return { action: "harvest", sourceId: source.id };
}

const actions = {
  /**
   * @param {Creep} creep
   * @returns {HarvesterState}
   */
  default(creep) {
    return newHarvestState(creep);
  },
  /**
   * @param {Creep} creep
   * @param {HarvestState} state
   * @returns {HarvesterState?}
   */
  harvest(creep, state) {
    const source = Game.getObjectById(state.sourceId);
    utils.doOrMove(creep, source, (c) => c.harvest(source));

    if (creep.store.getFreeCapacity() === 0) {
      return { action: "unload" };
    }
  },
  /**
   * @param {Creep} creep
   * @param {UnloadState} state
   * @returns {HarvesterState?}
   */
  unload(creep, state) {
    const priorityTarget = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (structure) => {
        return (
          (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) &&
          structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      },
    });

    const containerTarget =
      priorityTarget == null
        ? creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
              return (
                structure.structureType === STRUCTURE_CONTAINER && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
              );
            },
          })
        : null;

    const target = priorityTarget || containerTarget;
    if (target != null) {
      utils.doOrMove(creep, target, (c) => c.transfer(target, RESOURCE_ENERGY));
    }

    if (creep.store.getUsedCapacity() === 0) {
      return newHarvestState(creep);
    }
  },
};

module.exports = {
  /**
   * @param {StructureSpawn} spawnStructure
   * @returns {bool}
   */
  spawn(spawnStructure) {
    const count = Memory.harvesterCount != null ? Memory.harvesterCount : 0;

    const energyCapacity = spawnStructure.room.energyAvailable;
    const [bodyParts, mark] =
      energyCapacity >= 500 ? [[CARRY, MOVE, MOVE, MOVE, WORK, WORK, WORK], 2] : [[CARRY, WORK, MOVE], 1];

    const resp = spawnStructure.spawnCreep(bodyParts, `Harvester ${count} - MK${mark}`, {
      memory: { role: "harvester", mark },
    });
    const ok = resp === OK;
    if (ok) {
      Memory.harvesterCount = count + 1;
    }
    return ok;
  },

  /** @param {Creep} creep */
  run(creep) {
    /** @type {HarvesterState} */
    const state = creep.memory.state || actions.default(creep);

    const actionFn = actions[state.action];
    if (actionFn === undefined) {
      throw Error(`Unknown action ${state.action}`);
    }

    const updatedState = actionFn(creep, state);

    if (updatedState != null) {
      creep.memory.state = updatedState;
    }
  },
};
