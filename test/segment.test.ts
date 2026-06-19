import { describe, test, expect } from 'bun:test';
import { segmentParagraphs } from '../src/segment';

describe('segmentParagraphs', () => {
  test('splits two paragraphs on a blank line', () => {
    expect(segmentParagraphs('a\n\nb')).toEqual(['a', 'b']);
  });

  test('keeps a single paragraph intact', () => {
    expect(segmentParagraphs('just one line\nstill same')).toEqual(['just one line\nstill same']);
  });

  test('collapses multiple blank lines without emitting empties', () => {
    expect(segmentParagraphs('a\n\n\n\nb')).toEqual(['a', 'b']);
  });

  test('drops leading and trailing blanks', () => {
    expect(segmentParagraphs('\n\na\n\n')).toEqual(['a']);
  });

  test('treats a backtick fence as atomic', () => {
    expect(segmentParagraphs('intro\n\n```\na\n\nb\n```\n\noutro')).toEqual([
      'intro',
      '```\na\n\nb\n```',
      'outro',
    ]);
  });

  test('treats a tilde fence as atomic', () => {
    expect(segmentParagraphs('~~~\nx\n\ny\n~~~')).toEqual(['~~~\nx\n\ny\n~~~']);
  });

  test('does not close a fence on a mismatched fence char', () => {
    expect(segmentParagraphs('```\na\n~~~\nb\n```')).toEqual(['```\na\n~~~\nb\n```']);
  });
});
