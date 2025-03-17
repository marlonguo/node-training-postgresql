const { EntitySchema } = require("typeorm");

const Skill = new EntitySchema({
  name: "Skill",
  tableName: "SKILL",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
    },
    name: {
      type: "varchar",
      length: 50,
      nullable: false,
      unique: true,
    },
    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
      nullable: false,
    },
  },
});

module.exports = Skill;
