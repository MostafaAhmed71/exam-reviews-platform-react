/**
 * Helper function to convert grade number to descriptive text
 */
export function getGradeName(grade: number): string {
    const gradeNames: Record<number, string> = {
        7: 'الصف الأول متوسط',
        8: 'الصف الثاني متوسط',
        9: 'الصف الثالث متوسط',
        10: 'الصف الأول ثانوي',
        11: 'الصف الثاني ثانوي',
        12: 'الصف الثالث ثانوي',
    };
    return gradeNames[grade] || `الصف ${grade}`;
}

