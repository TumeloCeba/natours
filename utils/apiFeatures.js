class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];

    excludeFields.forEach((element) => {
      delete queryObj[element];
    });

    //ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    let sortBy;

    if (this.queryString.sort) {
      sortBy = this.queryString.sort.replace(/,/g, ' ');
    } else {
      sortBy = '-createdBy';
    }

    this.query = this.query.sort(sortBy);
 
    return this;
  }

  project() {
    let fields;
    if (this.queryString.fields) {
      fields = this.queryString.fields.replace(/,/g, ' ');
    } else {
      fields = '-__v';
    }

    this.query = this.query.select(fields);

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    // page=2&limit=10 ,page 1=1-10 page 2 = 11 - 20

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
