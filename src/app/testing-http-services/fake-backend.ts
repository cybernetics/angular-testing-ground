import { MockBackend, MockConnection } from '@angular/http/testing';
import { Http, BaseRequestOptions, Response, ResponseOptions, RequestMethod } from '@angular/http';
import { Provider } from '@angular/core';

interface BackendExpectationOptions {
  url: string; body: string; method: RequestMethod
}

export class BackendExpectation {
  private status: number;
  private body: string;
  private isVerified = false;

  constructor(private options: BackendExpectationOptions) {}

  respond(body: string) {
    this.status = 200;
    this.body = body;
  }

  verify(connection: MockConnection) {
    this.isVerified = true;

    expect(connection.request.url).toEqual(this.options.url, 'Request url missmatch.');
    expect(connection.request.method).toEqual(this.options.method, 'Request method missmatch.');

    let responseOptions = new ResponseOptions({
      body: this.body,
      status: this.status
    });
    connection.mockRespond(new Response(responseOptions));
  }
}

export class FakeBackend extends MockBackend {
  _connections: MockConnection[] = [];
  _expectations: BackendExpectation[] = [];
  autoRespond = true;

  static getProviders(): Provider[] {
    return [
      FakeBackend,
      BaseRequestOptions,
      {
        provide: Http,
        useFactory: (backend, defaultOptions) => {
          return new Http(backend, defaultOptions);
        },
        deps: [FakeBackend, BaseRequestOptions]
      }
    ];
  }

  constructor() {
    super();

    this.connections.subscribe((connection) => {
      this._connections.push(connection);

      if (this.autoRespond) {
        this._verifyExpectation(this._connections.length - 1);
      }
    });
  }

  setAutoRespond(autoRespond: boolean) {
    this.autoRespond = autoRespond;
  }

  expectGET(url: string) {
    return this._addExpectation({ url, body: '', method: RequestMethod.Get });
  }

  flush() {
    this._connections.forEach((connection, order) => {
      this._verifyExpectation(order);
    });
  }

  private _addExpectation(options: BackendExpectationOptions) {
    let expectation = new BackendExpectation(options);
    this._expectations.push(expectation);
    return expectation;
  }

  private _verifyExpectation(order: number) {
    this._expectations[order].verify(
      this._connections[order]
    );
  }
}
