import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@memoir/contract';
import { EntriesService } from './entries.service';

@Controller()
export class EntriesController {
  constructor(private readonly entries: EntriesService) {}

  @TsRestHandler(contract.entries.list)
  list() {
    return tsRestHandler(contract.entries.list, async ({ query }) => ({
      status: 200 as const,
      body: this.entries.findAll(query),
    }));
  }

  @TsRestHandler(contract.entries.get)
  get() {
    return tsRestHandler(contract.entries.get, async ({ params }) => {
      const entry = this.entries.findOne(params.id);
      if (!entry) return { status: 404 as const, body: { error: 'Not found' } };
      return { status: 200 as const, body: entry };
    });
  }

  @TsRestHandler(contract.entries.create)
  create() {
    return tsRestHandler(contract.entries.create, async ({ body }) => ({
      status: 201 as const,
      body: await this.entries.create(body),
    }));
  }

  @TsRestHandler(contract.entries.update)
  update() {
    return tsRestHandler(contract.entries.update, async ({ params, body }) => {
      const entry = this.entries.update(params.id, body);
      if (!entry) return { status: 404 as const, body: { error: 'Not found' } };
      return { status: 200 as const, body: entry };
    });
  }

  @TsRestHandler(contract.entries.remove)
  remove() {
    return tsRestHandler(contract.entries.remove, async ({ params }) => {
      this.entries.remove(params.id);
      return { status: 204 as const, body: undefined };
    });
  }

  @TsRestHandler(contract.entries.bulk)
  bulk() {
    return tsRestHandler(contract.entries.bulk, async ({ body }) => ({
      status: 200 as const,
      body: { affected: this.entries.bulk(body.ids, body.op, body.tags) },
    }));
  }

  @TsRestHandler(contract.sessions.list)
  sessions() {
    return tsRestHandler(contract.sessions.list, async () => ({
      status: 200 as const,
      body: this.entries.findSessions(),
    }));
  }
}
