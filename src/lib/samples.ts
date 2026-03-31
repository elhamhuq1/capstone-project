import { eq } from 'drizzle-orm';
import { writingSamples } from './db/schema';
import { db } from './db';

export const WRITING_SAMPLES: {
  id: number;
  title: string;
  content: string;
  grammarlyScore: number;
}[] = [
  {
    id: 1,
    title: 'Technology and Workplace Productivity',
    content: `Technology has changed the way people work in many different ways, and it is something that continues to evolve over time in ways that are both predictable and also sometimes unexpected which makes it kind of hard to fully understand its overall impact. Many people would agree that technology makes work easier, faster, and more efficient, however this is not always completely true in every situation that exists in the modern workplace today and sometimes even the opposite happens. While tools such as email, messaging apps, and project management software are designed to help people stay organized they can also create new problems that did not exist before, which is something people don't always think about enough.

For instance, email allows workers to communicate quickly which is helpful in many cases where fast responses are needed, but at the same time it creates an expectation that people should always be available even outside of working hours. This can be stressful for many employees. And it makes it difficult to separate personal life from work life, especially when working remotely which has become more common in recent years. Because of this workers may feel overwhelmed, this can reduce productivity even though the tools are meant to improve it, which is kind of ironic in a way.

Another issue that comes from technology is the overuse of productivity tools themselves, people spend a lot of time organizing tasks, updating apps, checking notifications instead of actually completing meaningful work. This results in a situation where people feel busy, but they are not necessarily productive, or at least not in a way that actually matters. In some cases this over reliance on tools can even reduce a person's ability to manage time independently without assistance from software which is not a good thing long term.

Additionally technology can create distractions that are difficult to avoid especially when notifications are constantly appearing on screens throughout the day, even if a person tries to focus it is easy to get interrupted which breaks concentration. This reduces efficiency over time in ways that are not always obvious at first. There is also the issue of multitasking, which people think helps but actually doesn't always help and sometimes makes things worse.

In conclusion technology has both positive and negative effects on productivity, and it is not entirely accurate to say that it always improves efficiency because that is not always true. Instead it depends on how individuals and organizations choose to use it, which is something that requires more attention and awareness than it currently gets in many workplaces today, and maybe should be looked at more carefully.`,
    grammarlyScore: 54,
  },
  {
    id: 2,
    title: 'The Value of College Education',
    content: `College education is often seen as an important step in achieving success, but the reality is more complicated than people sometimes assume when they talk about it. Many individuals believe that going to college will automatically lead to better job opportunities and higher income, which is often true in many cases, however this is not guaranteed for everyone who decides to pursue a degree and that is something that gets overlooked a lot. There are many factors that influence whether college is worth it, including the field of study, cost of tuition, and the individual goals of the student which can vary a lot from person to person.

One of the main arguments in favor of college is that it provides knowledge and skills that are necessary for certain careers, such as engineering, medicine, and education. Without a degree it would be very difficult, if not impossible to enter these professions. But at the same time there are other careers where a college degree is not required, and individuals can succeed through experience, training programs, or even starting their own business. This raises the question of whether college is truly necessary for everyone, or if it is only beneficial in certain situations which is something people don't always agree on.

Another point to consider is the cost of college which has been increasing significantly over the years, making it less accessible for many students. Some people graduate with large amounts of debt, which can take many years to pay off and this financial burden can affect their future decisions. For example, delaying buying a house or not being able to save money properly. While scholarships and financial aid are available they do not always cover all expenses, and not every student qualifies for enough support which creates another problem.

In addition to academic knowledge college is also said to teach important life skills such as independence, critical thinking, and communication. These skills are valuable in many areas of life, not just careers. However it is possible to develop these skills outside of college as well, through work experience or other forms of learning, so it is not completely unique to college like some people claim that it is.

In conclusion while college can be beneficial in many ways, it is not the only path to success and it may not be the best choice for everyone depending on their situation and goals. Therefore it is important to carefully consider whether attending college is the right decision, instead of just assuming it is necessary because that might not always be the case for every person.`,
    grammarlyScore: 64,
  },
  {
    id: 3,
    title: 'Social Media and Its Effects on Society',
    content: `Social media has become a major part of modern life, influencing how people communicate, share information, and spend their time on a daily basis in ways that were not really possible before. While many people use social media for positive reasons such as staying connected with friends and family, there are also several negative effects that should be considered more seriously than they often are but usually are not. The impact of social media is complex, and it cannot be described as entirely good or entirely bad without considering multiple perspectives, which people don't always do.

One of the most obvious benefits of social media is the ability to communicate instantly with others regardless of distance, which has made it easier to maintain relationships over long periods of time. This is especially important for people who live far away from their loved ones. However this constant connectivity can also reduce the quality of in person interactions, as people may become more focused on their online presence instead of real life relationships which is not always a good thing.

Another issue with social media is the way it can affect mental health, particularly among younger users who may be more influenced by what they see online. People often compare themselves to others based on posts and pictures, which can lead to feelings of inadequacy or low self esteem. This is because social media often presents an unrealistic version of reality where people only share the best parts of their lives and not the bad parts, which creates a false image of what life is actually like.

In addition to mental health concerns social media can also contribute to the spread of misinformation, which is a growing problem in today's society and has been talked about more recently. Information can be shared quickly without being verified, leading to confusion and misunderstanding among users. This can have serious consequences especially when it involves important topics such as health or politics, which makes it even more concerning.

In conclusion social media has both advantages and disadvantages, and its overall impact depends on how it is used by individuals. While it offers many benefits it also presents risks that should not be ignored, and people should be more mindful of their usage habits in order to minimize negative outcomes, although not everyone actually does this which is part of the problem.`,
    grammarlyScore: 75,
  },
];

/**
 * Seeds the writing_samples table with essay data.
 * Upserts — updates content if sample already exists with different text.
 */
export async function seedWritingSamples() {
  for (const sample of WRITING_SAMPLES) {
    // Check if sample already exists
    const existing = await db
      .select({ id: writingSamples.id, content: writingSamples.content })
      .from(writingSamples)
      .where(eq(writingSamples.id, sample.id));

    if (existing.length > 0) {
      // Update if content has changed
      if (existing[0].content !== sample.content) {
        await db
          .update(writingSamples)
          .set({
            title: sample.title,
            content: sample.content,
            grammarlyScore: sample.grammarlyScore,
          })
          .where(eq(writingSamples.id, sample.id));
      }
      continue;
    }

    await db
      .insert(writingSamples)
      .values({
        id: sample.id,
        title: sample.title,
        content: sample.content,
        grammarlyScore: sample.grammarlyScore,
      });
  }
}
