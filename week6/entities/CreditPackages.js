const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'CreditPackage',
  tableName: 'CREDIT_PACKAGE',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
      nullable: false,
    },
    name: {
      type: 'varchar',
      length: 50,
      nullable: false,
      unique: true,
    },
    credit_amount: {
      type: 'integer',
      nullable: false,
    },
    price: {
      type: 'numeric',
      precision: 10,
      scale: 2,
      nullable: false,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
      name: 'created_at',
      nullable: false,
    },
  },
  relations: {
    User: {
      target: 'User',
      type: 'many-to-one',
      inverseSide: 'CreditPurchase',
      joinColumn: {
        name: 'user_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'user_id_fk',
      },
    },
    CreditPackage: {
      target: 'CreditPackage',
      type: 'many-to-one',
      inverseSide: 'CreditPurchase',
      joinColumn: {
        name: 'credit_package_id',
        referencedColumnName: 'id',
        foreignKeyConstraintName: 'credit_package_id_fk',
      },
    },
  },
});
