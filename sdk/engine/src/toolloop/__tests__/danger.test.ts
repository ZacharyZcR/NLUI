import { describe, it, expect } from 'vitest';
import { isDangerous } from '../danger.js';

describe('isDangerous', () => {
  it('detects dangerous tool names', () => {
    expect(isDangerous('deletePet', '{}')).toBe(true);
    expect(isDangerous('removeUser', '{}')).toBe(true);
    expect(isDangerous('destroySession', '{}')).toBe(true);
    expect(isDangerous('dropTable', '{}')).toBe(true);
    expect(isDangerous('purgeCache', '{}')).toBe(true);
    expect(isDangerous('resetPassword', '{}')).toBe(true);
  });

  it('passes safe tool names', () => {
    expect(isDangerous('listPets', '{}')).toBe(false);
    expect(isDangerous('getPet', '{}')).toBe(false);
    expect(isDangerous('createPet', '{}')).toBe(false);
    expect(isDangerous('updatePet', '{}')).toBe(false);
  });

  it('detects dangerous args', () => {
    expect(isDangerous('callAPI', '{"method": "delete"}')).toBe(true);
    expect(isDangerous('callAPI', '{"method": "put"}')).toBe(true);
    expect(isDangerous('callAPI', '{"method": "patch"}')).toBe(true);
  });

  it('passes safe args', () => {
    expect(isDangerous('callAPI', '{"method": "get"}')).toBe(false);
    expect(isDangerous('callAPI', '{"method": "post"}')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isDangerous('DELETE_pet', '{}')).toBe(true);
    expect(isDangerous('REMOVE_user', '{}')).toBe(true);
  });
});
