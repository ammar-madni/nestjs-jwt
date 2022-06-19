import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy, JwtRefreshStrategy } from './strategies';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
