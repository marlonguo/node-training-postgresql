const { EntitySchema } = require("typeorm");

const User = new EntitySchema({
  name: "User",
  tableName: "USER",
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
    },
    email: {
      type: "varchar",
      length: 320,
      nullable: false,
      unique: true,
    },
    role: {
      type: "varchar",
      length: 20,
      nullable: false,
    },
    password: {
      type: "varchar",
      length: 72,
      nullable: false,
      select: false,
    },
    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
      nullable: false,
    },
    updatedAt: {
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
      nullable: false,
    },
  },
});

module.exports = User;
