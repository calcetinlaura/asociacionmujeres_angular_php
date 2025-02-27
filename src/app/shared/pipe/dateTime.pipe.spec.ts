import { DateTimePipe } from './dateTime.pipe';

describe('DateTimePipe', () => {
  it('create an instance', () => {
    const pipe = new DateTimePipe();
    expect(pipe).toBeTruthy();
  });
});
