const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'CreditPurchase',
  tableName: 'CREDIT_PURCHASE',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
      nullable: false,
    },
    user_id: {
      type: 'uuid',
      nullable: false,
    },
    credit_package_id: {
      type: 'uuid',
      nullable: false,
    },
    purchased_credits: {
      type: 'integer',
      nullable: false,
    },
    price_paid: {
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
    purchase_at: {
      type: 'timestamp',
      nullable: false,
    },
  },
});
