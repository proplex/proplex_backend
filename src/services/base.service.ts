import { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { NotFoundError } from '../errors/not-found-error';

export class BaseService<T extends Document> {
  constructor(private model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async findById(
    id: string, 
    populate: string | string[] | any[] = ''
  ): Promise<T | null> {
    const query = this.model.findById(id);
    if (populate) {
      if (Array.isArray(populate) && populate.length > 0) {
        // Handle array of populate options (string or object)
        for (const pop of populate) {
          query.populate(pop);
        }
      } else {
        // Handle single populate option (string or object)
        query.populate(populate as any);
      }
    }
    return query.exec();
  }

  async findOne(
    conditions: FilterQuery<T>,
    populate: string | string[] | any[] = ''
  ): Promise<T | null> {
    const query = this.model.findOne(conditions);
    if (populate) {
      if (Array.isArray(populate) && populate.length > 0) {
        // Handle array of populate options (string or object)
        for (const pop of populate) {
          query.populate(pop);
        }
      } else {
        // Handle single populate option (string or object)
        query.populate(populate as any);
      }
    }
    return query.exec();
  }

  async find(
    conditions: FilterQuery<T> = {},
    options: {
      sort?: Record<string, 1 | -1>;
      limit?: number;
      skip?: number;
      populate?: string | string[] | any[]; // Allow object populate options
      select?: string;
    } = {}
  ): Promise<T[]> {
    const { sort, limit, skip, populate, select } = options;
    
    let query = this.model.find(conditions);
    
    if (sort) query = query.sort(sort);
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    if (populate) {
      if (Array.isArray(populate) && populate.length > 0) {
        // Handle array of populate options (string or object)
        for (const pop of populate) {
          query = query.populate(pop);
        }
      } else {
        // Handle single populate option (string or object)
        query = query.populate(populate as any);
      }
    }
    if (select) query = query.select(select);
    
    return query.exec();
  }

  async update(
    id: string,
    data: UpdateQuery<T>,
    options: QueryOptions = { new: true }
  ): Promise<T | null> {
    const updated = await this.model
      .findByIdAndUpdate(id, data, options)
      .exec();
    
    if (!updated) {
      throw new NotFoundError(`${this.model.modelName} not found`);
    }
    
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async count(conditions: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(conditions).exec();
  }

  async exists(conditions: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(conditions).exec();
    return count > 0;
  }

  async paginate(
    conditions: FilterQuery<T> = {},
    options: {
      page?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
      populate?: string | string[] | any[]; // Allow object populate options
      select?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.count(conditions),
      this.find(conditions, {
        ...options,
        skip,
        limit
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page
      }
    };
  }
}
