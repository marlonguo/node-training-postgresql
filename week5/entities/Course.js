const { EntitySchema } = require("typeorm");

const Course = new EntitySchema({
  name: "Course",
  tableName: "COURSE",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: "uuid",
      nullable: false,
    },
    user_id: {
      type: "uuid",
      nullable: false,
    },
    skill_id: {
      type: "uuid",
      nullable: false,
    },
    name: {
      type: "varchar",
      length: 100,
      nullable: false,
    },
    description: {
      type: "text",
      nullable: false,
    },
    start_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
    },
    end_at: {
      type: "timestamp",
      createDate: true,
      nullable: false,
    },
    max_participants: {
      type: "integer",
      nullable: false,
    },
    meeting_url: {
      type: "varchar",
      length: 2048,
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
  relations: {
    User: {
      target: "User",
      type: "many-to-many",
      inverseSides: "Course",
      JoinColumn: {
        name: "user_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "course_user_id_fk",
      },
    },
    Skill: {
      target: "Skill",
      type: "many-to-many",
      inverseSide: "Course",
      joinColumn: {
        name: "skill_id",
        referencedColumnName: "id",
        foreignKeyConstraintName: "course_user_id_fk",
      },
    },
  },
});

module.exports = Course;
